var _ = require( 'lodash' );
var winston = require( 'winston' );

function parse( argv ) {
  var o = {
    ymlFile: 'docker-stack.yml',
    environment: {},
    command: null,
    options: [],
    container: null,
    arguments: [],
  };

  var cursor = 0;

  // The first pass looks for main options (-f, -e) and stops when it hits the command (string with no leading -)
  var stop = false;
  while( argv[cursor] && !stop ) {
    if ( ! ( argv[cursor].charAt(0) == '-' ) ) {
      o.command = argv[cursor];
      stop = true;
    }
    else {
      if ( argv[cursor] == '-f' || argv[cursor] == '--file' ) {
	cursor += 1;
	o.ymlFile = argv[cursor];
      }
      else if ( argv[cursor] == '-e' || argv[cursor] == '--env' ) {
	cursor += 1;
	var envvar = argv[cursor];
	var parts = envvar.split('=');
	var env = parts.shift();
	var val = parts.join('=');
	o.environment[ env ] = val;
      }
      else if ( argv[cursor] == '-n' ) {
	o.n = true;
      }
      else if ( argv[cursor] == '-d' || argv[cursor] == '--debug' ) {
	o.level = 'debug';
      }
      else if ( argv[cursor] == '-m' || argv[cursor] == '--machine' ) {
	cursor += 1;
	o.machine = argv[cursor];
      }
    }
    cursor += 1;
  }

  // everthing now is optional.  
  stop = false;
  var blind = false;
  while( argv[cursor] && !stop ) {
    if ( argv[cursor] == '--' ) {
      // everting after this goes into options
      blind = true;
    }
    else if ( argv[cursor].charAt(0) == '^' ) {
      o.options.push( argv[cursor].slice(1) );
    }
    else if ( ! blind && ! ( argv[cursor].charAt(0) == '-' ) ) {
      o.container = argv[cursor];
      stop = true;
    }
    else {
      o.options.push( argv[cursor] );
    }
    cursor += 1;
  }

  // if we have a container, the remaining are arguments
  while( argv[cursor] ) {
    o.arguments.push( argv[cursor] );
    cursor += 1;
  }

  o.log = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
	level: o.level || 'info',
	colorize: true,
	prettyPrint: true,
      }),
    ]
  });
  
  return o;
}

module.exports = parse;


