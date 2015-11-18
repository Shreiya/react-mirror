var path          = require('path'),
    express       = require('express'),
    program       = require('commander'),
    fs            = require('fs'),
    request       = require('request'),
    semver        = require('semver'),
    pkg           = require(path.join(__dirname, 'package.json'));

program
  .version(pkg.version)
  .option('-p, --port <port>',         'Port on which to listen to (defaults to 8080)', parseInt)
  .option('-S, --ssl',                 'Enable https (defaults to port 8443)')
  .option('-C, --cert <path to cert>', 'Path to ssl cert file (default: cert.pem)')
  .option('-K, --key  <path to key>',  'Path to ssl key file (default: key.pem)')
  .option('-b, --beta',                'Enable prelease (beta)')
  .parse(process.argv);

var ssl  = !!program.ssl,
    beta = !!program.beta,
    port = program.port || ssl ? 8443 : 8080,
    cert = program.cert || path.join(__dirname, 'cert.pem'),
    key  = program.key  || path.join(__dirname, 'key.pem'),    
    app  = express(), 
    server,
    requestOpts = {
      url: 'https://api.github.com/repos/murugaratham/react-mirror/releases',
      headers: {
        'User-Agent': 'react-mirror'
      }
    };

app.use('/', express.static(__dirname + '/'));

//server

if(ssl) {
  var opts = {};
  server = require('https');
  opts.cert = fs.readFileSync(cert);
  opts.key = fs.readFileSync(key);
  server.createServer(opts, app).listen(port);
} else {
  server = require('http');
  server.createServer(app).listen(port);
}


//regular updates

if(beta) {
  requestOpts.url += '/latest';
}

function gitCallback (err, res, body) {
  if(!err && res.statusCode == 200) {
    var releases = JSON.parse(body);
    var gitPkg;
    if(beta) {
      var prereleases = releases.filter(function(release) {
        return release.prerelease === true;
      });
      gitPkg = prerelease.sort(semver.rcompare)[0];
    } else {
      gitPkg = releases[0];
    }
    //check updated package version vs local version
    //if(semver.lt(pkg.version, gitPkg.tag_name)) {
      var download = function (path) {
        try {
          fs.mkdirSync(path);
          fs.createWriteStream(gitPkg.tag_name+'.zip');
          console.log('download complete');
        } catch (e) {
          if (e.code != 'EEXIST') throw e;
        }
      }
      request(gitPkg.zipball_url)
        .on('error', function(err) {
          console.log(err)
        })
        .pipe(download('./tmp'));
      //update local server
    //  server.destroy(); //shut down the server
    //}
  }
}

request(requestOpts, gitCallback);

console.log('pid is ' + process.pid);
console.log('Running server at port: ' + port);

var gracefulShutdown = function() {
  console.log('Received kill signal, shutting down gracefully.');
  server.close(function() {
    console.log('Closed out remaining connections.');
    process.exit()
  });
  
   // if after 
   setTimeout(function() {
       console.error('Could not close connections in time, forcefully shutting down');
       process.exit()
  }, 10*1000);
}


//http://glynnbird.tumblr.com/post/54739664725/graceful-server-shutdown-with-nodejs-and-express
process.on ('SIGTERM', gracefulShutdown);
process.on ('SIGINT', gracefulShutdown);


