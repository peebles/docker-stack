var _ = require( 'lodash' );
var winston = require( 'winston' );

module.exports = function( app ) {
  var yaml = require( '../lib/yaml' )( app );
  var cutils = require( '../lib/container' )( app );

  app.ymlFile = 'docker-stack.yml';
  app.environment = {};
  app.command = null;
  app.options = [];
  app.container = null;
  app.arguments = [];
  
  function parse( argv ) {
    
    var cursor = 0;

    // The first pass looks for main options (-f, -e) and stops when it hits the command (string with no leading -)
    var stop = false;
    while( argv[cursor] && !stop ) {
      if ( ! ( argv[cursor].charAt(0) == '-' ) ) {
	app.command = argv[cursor];
	stop = true;
      }
      else {
	if ( argv[cursor] == '-f' || argv[cursor] == '--file' ) {
	  cursor += 1;
	  app.ymlFile = argv[cursor];
	}
	else if ( argv[cursor] == '-e' || argv[cursor] == '--env' ) {
	  cursor += 1;
	  var envvar = argv[cursor];
	  var parts = envvar.split('=');
	  var env = parts.shift();
	  var val = parts.join('=');
	  app.environment[ env ] = val;
	}
	else if ( argv[cursor] == '-n' ) {
	  app.n = true;
	}
	else if ( argv[cursor] == '-d' || argv[cursor] == '--debug' ) {
	  app.level = 'debug';
	}
	else if ( argv[cursor] == '-m' || argv[cursor] == '--machine' ) {
	  cursor += 1;
	  app.machine = argv[cursor];
	}
      }
      cursor += 1;
    }

    // once here, I have the yaml file.  Read it now so we know the container names
    yaml.readMainFile();

    // everthing now is optional.  
    stop = false;
    var blind = false;
    while( argv[cursor] && !stop ) {
      if ( ! ( argv[cursor].charAt(0) == '-' ) ) {
	//app.container = argv[cursor];
	if ( argv[cursor] == 'ALL' || cutils.find( argv[cursor] ) ) {
	  app.container = argv[cursor];
	  stop = true;
	}
	else {
	  app.options.push( argv[cursor] );
	}
      }
      else {
	app.options.push( argv[cursor] );
      }
      cursor += 1;
    }

    // if we have a container, the remaining are arguments
    while( argv[cursor] ) {
      app.arguments.push( argv[cursor] );
      cursor += 1;
    }

    app.log = new (winston.Logger)({
      transports: [
	new (winston.transports.Console)({
	  level: app.level || 'info',
	  colorize: true,
	  prettyPrint: true,
	}),
      ]
    });
  }

  return parse;
}


