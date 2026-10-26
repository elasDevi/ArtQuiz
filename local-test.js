import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('.',import.meta.url)));
if(Number(process.versions.node.split('.')[0])<24){console.error('Please install Node.js 24 LTS from https://nodejs.org, then try again.');process.exit(1)}
if(!existsSync('node_modules/express')){
 console.log('First launch: installing dependencies. Please wait...');
 const r=process.platform==='win32'?spawnSync('npm ci --no-audit --no-fund',{shell:true,stdio:'inherit'}):spawnSync('npm',['ci','--no-audit','--no-fund'],{stdio:'inherit'});
 if(r.status!==0){console.error('Installation failed. Check your internet connection and try again.');process.exit(1)}
}
const port=process.env.LOCAL_TEST_PORT||'3210',url=`http://127.0.0.1:${port}`;
console.log('\nLocal test only. No hosting or AI key required.');
console.log('Keep this window open while testing. Press Ctrl+C to stop.');
const child=spawn(process.execPath,['server.js'],{env:{...process.env,HOST:'127.0.0.1',PORT:port,NODE_ENV:'development',TRUST_PROXY:'0'},stdio:['inherit','pipe','inherit']});
let opened=false;child.stdout.on('data',chunk=>{process.stdout.write(chunk);if(!opened&&chunk.toString().includes('Prado listening')){
 opened=true;console.log('\nOPEN: '+url+'\nTeacher dashboard: '+url+'/admin');
 console.log('First-time teacher setup: open data/.setup-token with a text editor and use it in /admin to choose your password.');
 if(process.env.NO_BROWSER==='1')return;
 const command=process.platform==='win32'?'cmd':process.platform==='darwin'?'open':'xdg-open';
 const args=process.platform==='win32'?['/c','start','',url]:[url];
 const browser=spawn(command,args,{stdio:'ignore'});browser.on('error',()=>console.log('Open '+url+' in your browser.'));
}});
child.on('error',e=>{console.error(e.message);process.exitCode=1});
child.on('exit',code=>{if(!opened)console.error('Could not start. If port '+port+' is in use, close the other app and retry.');process.exitCode=code||0});
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));
