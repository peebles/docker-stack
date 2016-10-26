var _ = require( 'lodash' );
var fs = require( 'fs' );

module.exports = function( app ) {
  var lib = {};

  lib.find = function( name ) {
    var container =
    _.find( app.applications, { container_name: name } ) || _.find( app.applications, { __name: name } ) ||
    _.find( app.services, { container_name: name } ) || _.find( app.services, { __name: name } ) ||
    _.find( app.dataContainers, { container_name: name } ) || _.find( app.dataContainers, { __name: name } );
    return container;
  }

  lib.isComposeCommand = function( command ) {
    return(
      [ 'build', 'kill', 'pause', 'port', 'pull',
	'restart', 'rm', 'run', 'scale', 'start', 'stop',
	'unpause', 'up', 'ps' ].indexOf( command ) >= 0
    );
  }

  lib.isDockerCommand = function( command ) {
    return(
      [ 'exec', 'info', 'inspect', 'logs', 'stats', 'top' ].indexOf( command ) >= 0
    );
  }

  lib.isNpmScript = function( command ) {
    if ( fs.existsSync( 'package.json' ) ) {
      var yaml = require( '../lib/yaml' )( app );
      var doc = yaml.loadFile( 'package.json' );
      return _.get( doc, 'scripts.'+command );
    } else {
      return null;
    }
  }

  lib.isAnyCommand = function( command ) {
    var found = false;
    app.applications.forEach( function( container ) {
      var command = _.get( container, 'commands.'+app.command ) ||
                    _.get( app, 'stackConfig.commands.'+app.command );
      if ( command ) {
	found = true;
	return true;
      }
    });
    if ( found ) return true;
    if ( lib.isComposeCommand( command ) ) return true;
    if ( lib.isDockerCommand( command ) ) return true;
    return false;
  }
  
  return lib;
}
