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

    // Support for V2/3 files
    if ( doc.version && doc.services ) {
      var version = doc.version;
      var volumns = doc.volumes;
      var networks = doc.networks;
      doc = doc.services;
      app.stackConfig.version = version;
      app.stackConfig.volumes = volumns;
      app.stackConfig.networks = networks;
    }

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
      else c[ 'docker-machine' ] = app.stackConfig[ 'docker-machine' ] || 'localhost';
    });
    app.services.forEach( function( c ) {
      if ( c[ 'docker-machine' ] ) machines.push( c['docker-machine'] );
      else c[ 'docker-machine' ] = app.stackConfig[ 'docker-machine' ] || 'localhost';
    });
    app.dataContainers.forEach( function( c ) {
      if ( c[ 'docker-machine' ] ) machines.push( c['docker-machine'] );
      else c[ 'docker-machine' ] = app.stackConfig[ 'docker-machine' ] || 'localhost';
    });
    if ( app.stackConfig[ 'docker-machine' ] ) machines.push( app.stackConfig[ 'docker-machine' ] );
    app.machines = _.map( _.uniq( machines ), function( m ) {
      return {
	name: m,
	path: path.join( path.dirname( app.ymlFile ), m + '-' + shortid.generate() + '.yml' )
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

    let cfg = {};
    if ( app.stackConfig.version ) {
      cfg = {
	version: app.stackConfig.version,
	services: {}
      };
    }

    function handleNamedVolumes( o, volumes ) {
      var c = o[ _.keys(o)[0] ];
      if ( ! c.volumes ) return volumes;
      return volumes.concat( _.filter( c.volumes.map( (v) => {
	var named = v.split( ':' )[0];
	if ( named.match( /^[\.\/]/ ) ) return undefined;
	else return named;
      }), (n) => {
	return n !== undefined;
      }) );
    }
    
    function handleNetworks( o, networks ) {
      var c = o[ _.keys(o)[0] ];
      if ( ! c.networks ) return networks;
      else return networks.concat( c.networks );
    }
    
    app.machines.forEach( function( m ) {
      var services = {};
      var volumes = [];
      var networks = [];
      
      var containers = _.filter( app.dataContainers, { 'docker-machine': m.name } );
      containers.forEach( function( c ) {
	var o = clean( c );
	volumes = handleNamedVolumes( o, volumes );
	networks = handleNetworks( o, networks );
	_.merge( services, o );
      });

      containers = _.filter( app.services, { 'docker-machine': m.name } );
      containers.forEach( function( c ) {
	var o = clean( c );
	volumes = handleNamedVolumes( o, volumes ); 
	networks = handleNetworks( o, networks );
	_.merge( services, o );
      });

      containers = _.filter( app.applications, { 'docker-machine': m.name } );
      containers.forEach( function( c ) {
	var o = clean( c );
	volumes = handleNamedVolumes( o, volumes ); 
	networks = handleNetworks( o, networks );
	_.merge( services, o );
      });

      if ( app.stackConfig.version ) {
	var v;
	var n = {};
	if ( volumes.length ) {
	  v = {};
	  volumes.forEach( (name) => {
	    v[name] = app.stackConfig.volumes[ name ];
	  });
	}
	if ( app.stackConfig.networks && app.stackConfig.networks.default ) {
	  n.default = app.stackConfig.networks.default;
	}
	if ( networks.length ) {
	  networks.forEach( (name) => {
	    n[name] = app.stackConfig.networks[ name ];
	  });
	}
	var yml = {
	  version: app.stackConfig.version,
	  services: services,
	};
	if ( v ) yml.volumes = v;
	if ( _.keys(n).length ) yml.networks = n;
	fs.writeFileSync( m.path, yaml.safeDump( yml ) );
      }
      else {
	fs.writeFileSync( m.path, yaml.safeDump( services ) );
      }
    });
  }

  // remove generated docker-compose files
  lib.removeComposeFiles = function() {
    app.machines.forEach( function( m ) {
      if ( app.level !== 'debug' ) fs.unlinkSync( m.path );
      else console.log( "rm -f " + m.path );
    });
  }

  lib.loadFile = function( filename ) {
    return yaml.safeLoad( fs.readFileSync( filename, 'utf8' ) );
  }
  
  return lib;
}
