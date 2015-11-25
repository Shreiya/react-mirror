'use strict';

var path            = require('path'),
    program         = require('commander'),
    fs              = require('fs-extra'),
    request         = require('request'),
    semver          = require('semver'),
    extract         = require('extract-zip'),
    glob            = require('glob-fs'),
    winston         = require('winston'),
    dailyRotateFile = require('winston-daily-rotate-file'),
    cp              = require('child_process'),
    spawn           = cp.spawn,
    exec            = cp.exec,
    pkg             = require(path.join(__dirname, 'package.json'));

var ignore = require('ignore');
var glob   = require('glob');
var child;

program
  .version(pkg.version)
  .option('-b, --beta', 'Enable prelease (beta)')
  .option('-L, --log <0-5>', '(defaults to 0) <0-5>, error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5', parseInt)
  .option('-s, --silent', 'Disable logging to console')
  .parse(process.argv);

var logLevelMapping = [
  'error',
  'warn',
  'info',
  'verbose',
  'debug',
  'silly'
  ], logTransports  = [],
  logLevel          = logLevelMapping[!!program.log ? program.log : 0],
  isSilent          = !!program.silent || false,
  beta              = !!program.beta,
  defaultHeaders    = {
    headers: {'User-Agent': 'react-mirror'}
  };


if (!isSilent) {
  logTransports.push(new (winston.transports.Console)());
}

logTransports.push(new dailyRotateFile({
  name: 'file',
  filename: path.join(__dirname, 'logs', 'react-logs.logs'),
  datePattern: '.yyyy-MM-dd'
}));

var logger = new winston.Logger({
  level: logLevel,
  transports: logTransports,
  exitOnError: false
});

winston.handleExceptions(new winston.transports.File({ 
  filename: 'logs/fatal.log' 
}))

mkdirSync('logs'); //<-- in case there's no log folder

logger.log('silly', 'React bootstrap server initialize with following options -b %s -L %s -s %s', beta, logLevel, isSilent);
logger.log('info', 'Setting request default headers', defaultHeaders);
var baseRequest = request.defaults(defaultHeaders);
logger.log('silly', 'End setting request default headers');

//Utilities

function mkdirSync (path) {
  logger.log('silly', 'Begin creating directory %s', path);
  try {
    fs.mkdirSync(path);
    logger.log('info', 'Directory (%s) successfully created', path);
  } catch(e) {    
    if ( e.code != 'EEXIST' ) {
      logger.log('error', 'Error creating directory (%s), reason: %j', path, e.message);
      throw e;
    } else {
      logger.log('warn', 'Directory (%s) already exists', path);
    }
  }
}

function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + '/' + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

//

function cherryPickPackage(releases) {
  logger.log('silly', 'Begin cherry picking package');
  if(beta) {
    logger.log('info', 'React bootstrap server is running on beta channel, filtering prerelease package url');
    var prereleases = releases.filter(function(release) {
      return release.prerelease === true;
    });
    logger.log('silly', 'Begin sorting packages and returning latest');
    return prerelease.sort(semver.rcompare)[0];
  } else {
    logger.log('info', 'React bootstrap server is NOT running on beta channel, returning release package url');
    return releases[0];
  }
}

function compareLocalVersion(gitver) {
  logger.log('silly', 'Begin comparing installed version against cherry-picked version');
  logger.log('info', 'Installed version is (%s), cherry-picked version is (%s)', pkg.version, gitver);
  return semver.lt(pkg.version, gitver);
}

function fetchZipBall(gitPkg) {
  logger.log('silly', 'Begin fetching zipball from %s', gitPkg.zipball_url);
  logger.log('debug', 'Returning promise to caller');
  return new Promise(function (resolve, reject) {
    logger.log('silly', 'Begin preparing zipball destination path');
    var zipFilePath = path.join(__dirname, 'tmp', gitPkg.tag_name+'.zip');
    logger.log('silly', 'End preparing zipball destination path');
    logger.log('info', 'Zipball path is %s', zipFilePath);
    try {
      var r = baseRequest({ url: gitPkg.zipball_url });
      r.on('error', function (err) {
        return reject(err);
      })
      .on('response', function (res) {
        res.pipe(fs.createWriteStream(zipFilePath));
      })
      .on('complete', function () {
        extract(zipFilePath, {dir: './tmp'}, function (err) {
          if(err) { 
            return reject (err);
          } else {
            fs.unlink(zipFilePath);
            return resolve ();
          }
        });
      });
    } catch (err) { return reject (err); }
  });
}

function fetchZipBallErr(err) {
  console.log('Error downloading latest update, reason: ' + err);
}

function upgradeVersion(gitPkg) {
  //todo:
  //read latest .gitignore to skip files to be moved  
  var oldfiles, newfiles;
  mkdirSync('.react-tmp');
  glob('**', function(err, files){
    if (err) {
        console.log(err);
    } else {
      oldfiles = ignore().addIgnoreFile('.gitignore').filter(files);
      //copy all old none ignored files to .react-tmp
      console.log('Moving obsolete files: ');
      for(let i=0;i<oldfiles.length;i++) {
        //fs.copySync(oldfiles[i], path.join('.react-tmp', oldfiles[i]));
      }
    }
  });

  glob(path.join(__dirname, '/tmp/**/**'), function(err, files){
    if (err) {
        console.log(err);
    } else {
      var regex = new RegExp(/\/tmp\/(?:(?!\/).)*(.*)/);
      newfiles = ignore().addIgnoreFile('.gitignore').filter(files);
      console.log('Deploying new files');
      for(let i=0;i<newfiles.length;i++) {
      //copy unzipped release files onto cwd   
        var result = newfiles[i].match(regex);
        if(result) {
          console.log('old path: ' + newfiles[i]);
          console.log('new path: ' + path.join(__dirname, result[1]));
          //fs.copySync(newfiles[i], path.join(__dirname, result[1]));
        }
      }
      deleteFolderRecursive('.react-tmp');
    }
  });

    //run npm install, incase we have new dependencies
    //spawn a new node process
    //
    //
    //how do we update bootstrap.js then?
}

function gitCallback (err, res, body) {  
  try {
    if(!err && res.statusCode == 200) {
      var releases = JSON.parse(body);
      var gitPkg = cherryPickPackage(releases);
      var requireUpdate = compareLocalVersion(gitPkg.tag_name);
      //if(requireUpdate) {
        mkdirSync('./tmp');
        fetchZipBall(gitPkg).then(function() { 
          upgradeVersion(gitPkg)
        }, fetchZipBallErr);
      //}        
    } else {

    }
  } catch (e) {

  }
}

function startApp() {
  //try npm install to see if there's any new dependencies
  exec('npm install');
  exec('npm run build'); 
  //spawn a new instance of server
  child = spawn('node', ['server.js']);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', function (data) {
      var str = data.toString();
      console.log(str);
  });
  child.on('close', function (code) {
      console.log('process exit code ' + code);
  });
}


function stopApp() {
  return new Promise(function (resolve, reject) {
    if (child) {
      child.kill('SIGTERM');
      return resolve();
    } else {
      return reject('React mirror is not running');
    }
  });
}


//setInterval to check for updates
startApp();

setInterval(function() {
  baseRequest({url: 'https://api.github.com/repos/murugaratham/react-mirror/releases'}, gitCallback);
}, 10000);


//keep bootstrap running..
process.stdin.resume();
