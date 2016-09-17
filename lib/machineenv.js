// docker-machine env
module.exports = function( app ) {

  return function( machine, cb ) {
    if ( machine == 'localhost' ) return process.nextTick( cb );
    var cmd = app.stackConfig[ 'docker-machine-env' ] ||
	      'docker-machine env';
    cmd += ' ' + machine;
    require('child_process').exec( cmd, function( err, stdout, stderr ) {
      if ( err ) return cb( new Error( '"' + cmd + '" failed.  Perhaps the machine is not running?: ' + err.message ) );
      var lines = stdout.split( /\n/ );
      lines.forEach( function( line ) {
        var info = line.match( /^export ([^=]+)=(\S+)/ );
        if ( info ) {
          var variable = info[1];
          var value = info[2];
          value = value.replace( /^\"/, '' );
          value = value.replace( /\"$/, '' );
          process.env[ variable ] = value;
        }
      });
      cb();
    });
  }
  
}
