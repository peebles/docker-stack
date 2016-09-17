module.exports = function( app ) {
  var lib = {};

  lib.syscall = function( cmd, capture, cb ) {

    var captureStdio = false;
    if ( typeof capture == 'function' )
      cb = capture;
    else
      captureStdio = true;

    if ( cmd.match( /-it/ ) ) return lib.spawn( cmd, cb );

    if ( ! captureStdio ) app.log.info( 'syscall:', cmd );
    if ( app.n ) return cb();

    if ( process.env.DOCKERCMD ) cmd = cmd.replace( /^docker/, process.env.DOCKERCMD );

    var exec = require( 'child_process' ).exec;
    var child = exec( cmd, { maxBuffer: 400*1024, shell: "/bin/bash" } );

    var _stdout = '', _stderr = '';

    child.stdout.on( 'data', function( data ) {
      _stdout += data;
      //if ( ! captureStdio ) app.log.info( 'stdout:', data.replace( /\n$/, '' ) );
      if ( ! captureStdio ) console.log( data.replace( /\n$/, '' ) );
    });
    child.stderr.on( 'data', function( data ) {
      _stderr += data;
      //if ( ! captureStdio ) app.log.warn( 'stderr:', data.replace( /\n$/, '' ) );
      if ( ! captureStdio ) console.log( data.replace( /\n$/, '' ) );
    });
    child.on( 'exit', function( code ) {
      if ( code ) return cb( new Error( 'command returned code: ' + code ) );
      else cb( null, code, _stdout, _stderr );
    });
    child.on( 'error', function( err ) {
      if ( code ) return cb( new Error( 'command exitted abnormally: ' + err ) );
      else cb( null, err );
    });
  }

  lib.spawn = function( cmd, cb ) {
    if ( process.env.DOCKERCMD ) cmd = cmd.replace( /^docker/, process.env.DOCKERCMD );
    app.log.info( 'spawn:', cmd );
    if ( app.n ) return cb();

    cmd = cmd.replace( /\s$/, '' );
    var args = cmd.split( /\s+/ );
    var spawn = require( 'child_process' ).spawn;
    var child = spawn( args.shift(), args, {
      stdio: 'inherit',
    });
    child.on( 'close', function( code ) {
      if ( code ) return cb( new Error( 'command returned code: ' + code ) );
      else cb( null, code );
    });    
    child.on( 'error', function( err ) {
      if ( err ) return cb( new Error( 'command exitted abnormally: ' + err ) );
      else cb( null, err );
    });
  }

  return lib;
}
