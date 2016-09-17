var yaml = require( 'js-yaml' );
var fs   = require( 'fs' );
var path = require( 'path' );
var _ = require( 'lodash' );
var shortid = require( 'shortid' );

module.exports = function( app ) {

  var lib = {};

  // Read the main docker-stack yml file and parse it into the structures attached to app
  lib.readMainFile = function() {
    var doc = yaml.safeLoad( fs.readFileSync( app.ymlFile, 'utf8' ) );
    app.stackConfig = _.cloneDeep( doc.stack || {} );
    delete doc.stack;

    app.stackConfig.name = app.stackConfig.name || path.basename( path.dirname( app.ymlFile ) );

    // seperate out the applications, services and data containers
    app.applications = [];
    app.services = [];
    app.dataContainers = [];

    _.forIn( doc, function( spec, name ) {
      spec.__name = name;
      if ( spec['container-type'] == 'application' ) app.applications.push( spec );
      if ( spec['container-type'] == 'service' ) app.services.push( spec );
      if ( spec['container-type'] == 'data' ) app.dataContainers.push( spec );
    });

    // identify the unique set of docker-machines
    var machines = [];
    app.applications.forEach( function( c ) {
      if ( c[ 'docker-machine' ] ) machines.push( c['docker-machine'] );
      else c[ 'docker-machine' ] = app.stackConfig[ 'docker-machine' ];
    });
    app.services.forEach( function( c ) {
      if ( c[ 'docker-machine' ] ) machines.push( c['docker-machine'] );
      else c[ 'docker-machine' ] = app.stackConfig[ 'docker-machine' ];
    });
    app.dataContainers.forEach( function( c ) {
      if ( c[ 'docker-machine' ] ) machines.push( c['docker-machine'] );
      else c[ 'docker-machine' ] = app.stackConfig[ 'docker-machine' ];
    });
    if ( app.stackConfig[ 'docker-machine' ] ) machines.push( app.stackConfig[ 'docker-machine' ] );
    app.machines = _.map( _.uniq( machines ), function( m ) {
      return {
	name: m,
	path: path.join( path.dirname( app.ymlFile ), shortid.generate() + '.yml' )
      };
    });
  }

  // write the individual docker-compose files based on docker-machines
  lib.writeComposeFiles = function() {
    function clean( _obj ) {
      var obj = _.cloneDeep( _obj );
      var o = {};
      o[ obj.__name ] = obj;
      [ '__name', 'container-type', 'docker-machine', 'commands' ].forEach( function( key ) {
	delete obj[ key ];
      });
      return o;
    }
    app.machines.forEach( function( m ) {
      var YAML = '';
      var containers = _.filter( app.dataContainers, { 'docker-machine': m.name } );
      containers.forEach( function( c ) {
	var o = clean( c );
	YAML += yaml.safeDump( o );
      });
      containers = _.filter( app.services, { 'docker-machine': m.name } );
      containers.forEach( function( c ) {
	var o = clean( c );
	YAML += yaml.safeDump( o );
      });
      containers = _.filter( app.applications, { 'docker-machine': m.name } );
      containers.forEach( function( c ) {
	var o = clean( c );
	YAML += yaml.safeDump( o );
      });
      fs.writeFileSync( m.path, YAML );
    });
  }

  // remove generated docker-compose files
  lib.removeComposeFiles = function() {
    app.machines.forEach( function( m ) {
      fs.unlinkSync( m.path );
    });
  }

  lib.loadFile = function( filename ) {
    return yaml.safeLoad( fs.readFileSync( filename, 'utf8' ) );
  }
  
  return lib;
}
