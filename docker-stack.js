#!/usr/bin/env node

var _ = require( 'lodash' );
var async = require( 'async' );
var app = {};
process.argv.shift(); process.argv.shift();
require( './lib/commandline' )( app )( process.argv );
var yaml = require( './lib/yaml' )( app );
var exec = require( './lib/exec' )( app );
var cutils = require( './lib/container' )( app );
var machineenv = require( './lib/machineenv' )( app );

function exit( err ) {
  if ( err ) app.log.error( err );
  process.exit( err ? 1 : 0 );
}

if ( ! app.command ) {
  printHelp();
  process.exit(0);
}

// Now do the environment.  Let the command line over ride the stackConfig
//
_.forIn( app.stackConfig.environment, function( val, name ) {
  process.env[ name ] = val;
});
_.forIn( app.environment, function( val, name ) {
  process.env[ name ] = val;
});

// over ride stack's docker-machine with command line.
if ( app.machine ) app.stackConfig[ 'docker-machine' ] = app.machine;

// Process ...

if ( app.container && app.container != 'ALL' ) {
  var container = cutils.find( app.container );

  if ( ! cutils.isNpmScript( app.command ) ) {
    if ( ! container ) {
      exit( new Error( 'Cannot find the container named "' + app.container + '".' ) );
    }
  }
  
  var command = _.get( container, 'commands.'+app.command ) ||
		_.get( app, 'stackConfig.commands.'+app.command );

  if ( command ) {
    // its a stack or application custom command
    var cmd = [ 'docker exec -it',
		app.container,
		app.arguments.join( ' ' ),
		command, app.options.join( ' ' ) ].join( ' ' );
    machineenv( container[ 'docker-machine' ], function( err ) {
      if ( err ) exit( err );
      exec.syscall( cmd, function( err ) {
	if ( err ) exit( err );
	exit();
      });
    });
  }
  else if ( cutils.isComposeCommand( app.command ) ) {
    try {
      var composeFile = _.find( app.machines, { name: container[ 'docker-machine' ] } ).path;
    } catch( err ) {
      app.log.error( 'unable to determine compose file for operation.' );
      exit( err );
    }
    var cmd = [ 'docker-compose',
		'-p', app.stackConfig.name,
		'-f', composeFile,
		app.command,
		app.options.join( ' ' ),
		app.container,
		app.arguments.join( ' ' ) ].join( ' ' );
    machineenv( container[ 'docker-machine' ], function( err ) {
      if ( err ) exit( err );
      yaml.writeComposeFiles();
      exec.syscall( cmd, function( err ) {
	yaml.removeComposeFiles();
	if ( err ) exit( err );
	exit();
      });
    });
  }
  else if ( cutils.isDockerCommand( app.command ) ) {
    var cmd = [ 'docker',
		app.command, 
		app.options.join( ' ' ),
		app.container,
		app.arguments.join( ' ' ) ].join( ' ' );
    machineenv( container[ 'docker-machine' ], function( err ) {
      if ( err ) exit( err );
      exec.syscall( cmd, function( err ) {
	if ( err ) exit( err );
	exit();
      });
    });		
  }
  else {
    app.log.error( '"' + app.command +'" is not a known command' );
    printHelp();
    process.exit(1);
  }
  
}
else {
  // no container, so run the command against all applications (not services and not dataContainers),
  // or generate docker compose files (one for each unique docker-machine) and execute those.

  var done = false;

  async.series([
    function( cb ) {
      async.eachSeries( app.applications, function( container, cb ) {
	var command = _.get( container, 'commands.'+app.command ) ||
		      _.get( app, 'stackConfig.commands.'+app.command );
	
	if ( ! command ) return cb();

	// its a stack or application custom command
	var cmd = [ 'docker exec -it',
		    container.container_name || container.__name,
		    app.arguments.join( ' ' ),
		    command, app.options.join( ' ' ) ].join( ' ' );
	machineenv( container[ 'docker-machine' ], function( err ) {
	  if ( err ) return cb( err );
	  exec.syscall( cmd, function( err ) {
	    if ( err ) return cb( err );
	    done = true;
	    cb();
	  });
	});
      }, cb );
    },
    function( cb ) {
      if ( done ) return cb();
      if ( ! cutils.isComposeCommand( app.command ) ) return cb();
      // Its a compose command
      yaml.writeComposeFiles();
      async.eachSeries( app.machines, function( machine, cb ) {
	var cmd = [ 'docker-compose',
		    '-p', app.stackConfig.name,
		    '-f', machine.path,
		    app.command,
                    app.options.join( ' ' ) ].join( ' ' );
	machineenv( machine.name, function( err ) {
	  if ( err ) return cb( err );
	  exec.syscall( cmd, function( err ) {
	    cb( err );
	  });
	});
      }, function( err ) {
        yaml.removeComposeFiles();
	done = true;
	cb( err );
      });
    },
    function( cb ) {
      if ( done ) return cb();
      if ( ! cutils.isDockerCommand( app.command ) ) return cb();
      // Its a docker command
      async.eachSeries( app.applications, function( container, cb ) {
	var cmd = [ 'docker', app.command,
		    app.options.join( ' ' ),
		    container.container_name || container.__name,
		    app.arguments.join( ' ' ) ].join( ' ' );
	machineenv( container[ 'docker-machine' ], function( err ) {
	  if ( err ) return cb( err );
	  exec.syscall( cmd, function( err ) {
	    if ( err ) return cb( err );
	    done = true;
	    cb();
	  });
	});
      }, cb );
    },
    function( cb ) {
      if ( done ) return cb();
      printHelp();
      cb( new Error( '"' + app.command +'" is not a known command' ) );
    },
  ], function( err ) {
    exit( err );
  });
  
}

  
function printHelp() {
  var help = [
    '',
    'docker-stack [-d,--debug] [-n] [--env,-e VAR=VALUE ...] [-m,--machine docker-machine] [-f,--file docker-stack.yml]',
    '  COMMAND [options] [CONTAINER|ALL] [args]',
    '',
    'docker compose commands:',
    '  build, up, start, stop, restart, kill, rm, pause, unpause, pull, scale, port',
    '',
    'docker commands:',
    '  exec, logs, info, inspect, stats, top',
    '',
  ].join( "\n" );
  console.log( help );
}
