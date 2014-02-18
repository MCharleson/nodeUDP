// ===================================================
// test UDP node.js server for multiplayer Unity games
// ===================================================
require('sylvester'); //3d math
// ============== vars
var serverPort = 33333;
var serverHost = '192.168.0.11';
var maxnumplayers=10;
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var moveamt=.75;
var numplayers=0;
var udp=[];
var players=[];
var qq=[];
var serverInterval=2;
var playerNum=0;
var mob={};
var pob={};
var zob={};
var maxdisconnect=3000;
var ckey='';
var obkey='';
var pkey='';
var qdets=[];
var msg='';
var keyword='';
var clientid='';
var groupmsg='';
var numzombies=0;
var havezombiesender=false;
var sessionID='S'+getuid();
var tickcount=0;
console.log('========================================================================');
console.log('===================== SESSION : '+sessionID+'===========================');
console.log('========================================================================');
for (var i=0;i<1;i++) {
  numzombies++;
  var pkey='Z'+getuid();
  zob[pkey]={};
  zob[pkey].sq=0;
  zob[pkey].ad='';
  zob[pkey].po=0;
  zob[pkey].state='idle';
  zob[pkey].px=i;
  zob[pkey].py=2;
  zob[pkey].pz=0;
  zob[pkey].rx=0;
  zob[pkey].ry=0;
  zob[pkey].rz=0;
  zob[pkey].at=i+'1aaaaaaaa';
  zob[pkey].iv='aaaaaaaaaa';
}        
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}
server.on('listening', function () {
    var address = server.address();
    console.log('Unity UDP Server listening on ' + address.address + ":" + address.port);
});
server.on('message', function (message, remote) {
  //console.log('Server got msg from client :'+remote.address + ':' + remote.port +' - ' + message);
  processClientMessage(remote,message);
});

server.bind(serverPort, serverHost);

setInterval(function() {
  serverTick();
},serverInterval);


function sendMessageToClient(message,clientAddress,clientPort,clientID) {
  //console.log('sending message to '+clientAddress+', port='+clientPort);
  console.log('Server sending msg (players='+numplayers+') client ID='+clientID+' : '+message);;
  var msg = new Buffer(message);
  server.send(msg, 0, message.length, clientPort, clientAddress, function(err, bytes) {
    if (err) throw err;
    //console.log('Server sent msg to client: ' + clientHost +':'+ clientPort);
  });
}

function serverTick() {
  // check heartbeats/disconnects
  tickcount++;
  if (numplayers>0) {
    var disconnects=[];
    var reassignHZ=false;
    var tempnumplayers=0;
    // update disconnect heartbeat bins
    for(var id in pob) {
      if (pob[id].connected==1) {  //if connected
        pob[id].dc++;
        if (pob[id].dc>maxdisconnect) {  // user disconnected
          pob[id].connected=0;
          pob[id].ready=0;
          if (pob[id].hz==1) reassignHZ=true;
          pob[id].hz=0;
          disconnects.push(id);
          console.log('==============================');
          console.log('DISCONNECTED player '+id);
          numplayers--;
        } else {
          tempnumplayers++;
        }
      }  
    }
    if (disconnects.length!=0) {
      if (numplayers>0) {
        for (var i=0;i<disconnects.length;i++) {
          for(var id in pob) {
            if (pob[id].connected==1 && pob[id].ready==1 && id!=disconnects[i]) {
              //console.log('Sending disconnect msg to player '+id);
              sendMessageToClient('playerdisconnect,'+sessionID+','+id+',0,'+disconnects[i],pob[id].ad,pob[id].po,id);
              if (reassignHZ) {
                reassignHZ=false;
                pob[id].hz=1;
                sendMessageToClient('setzombiesender,'+sessionID+','+id+',0',pob[id].ad,pob[id].po,id);
              }
            }
          }
        }
      } else {
        console.log('*** Disconnected all players');
      }
      console.log('==============================');
    }
    // doublecheck we have a user to send zombie state updates
    var havesender=false;
    for(var id in pob) {
      if (pob[id].connected==1 && pob[id].ready==1) {
        if (pob[id].hz==1) havesender=true;
        break;
      }
    }
    if (!havesender) {
      for(var id in pob) {
        if (pob[id].connected==1 && pob[id].ready==1) {
          pob[id].hz=1;
          sendMessageToClient('setzombiesender,'+sessionID+','+id+',0',pob[id].ad,pob[id].po,id);
          break;
        }
      }
    }
    // ==========================
    // process the Q
    // ==========================
    if (qq.length>0) {
      // console.log('Server tick - processing Q length='+qq.length+'    (players='+numplayers+')');
      for (var i=0;i<qq.length;i++) {
        qdets=qq[i];
        keyword=getword(qdets.msg,0,',');
        clientid=getword(qdets.msg,2,',');
        if (pob[clientid].connected==1) {
          switch (true) {
          case (keyword=='oklogin'):
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break;
          case (keyword=='okgetworld'):
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break
          case (keyword=='okgetplayers'):  
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break;
          case (keyword=='okgetplayersnone'):  
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break;
          case (keyword=='newplayer'):  
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break;
          case (keyword=='okgetzombies'):  
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break;
          case (keyword=='okgetzombiesnone'):  
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break;
          case (keyword=='setzombiesender'):  
            sendMessageToClient(qdets.msg,qdets.ad,qdets.po,clientid);
            break;
          case (keyword=='state'):
            if (numplayers>1) {
              for(var id in pob){
                if (id!=clientid && pob[id].connected==1 && pob[id].ready==1) {
                  console.log('Send state to player '+id + ': ' + pob[id].ad+','+pob[id].po);
                  sendMessageToClient(qdets.msg,pob[id].ad,pob[id].po,id);
                }
              }
            }  
            break;
          case (keyword=='zombiestate'):
            if (numplayers>1) {
              for(var id in pob){
                if (id!=clientid && pob[id].connected==1 && pob[id].ready==1) {
                  console.log('Send state to player '+id + ': ' + pob[id].ad+','+pob[id].po);
                  sendMessageToClient(qdets.msg,pob[id].ad,pob[id].po,id);
                }
              }
            }  
            break;  
          }
        }
      }
      qq=[];
    }
  } else {
   console.log('0 players...tick...'+tickcount);
  }
}
function sendbulk() {
   sendMessageToClient(qdetails.actionmsg,players[j].address,players[j].port);
}   
function processClientMessage(remote,message) {
  message=message.toString('utf-8').trim();
  //udp=message.split(","[0]);
  //    0       1       2        3     4   5     6 7 8 9  10 11 12        13
  // keyword,sessionid,clientid,seq#,objid,state,x,y,z,rx,ry,rz,atributes,inventiory
  if (getword(message,0,',')=='login') {
    numplayers++;
    clientid='P'+getuid();
    pob[clientid]={};
    pob[clientid].id=clientid;
    pob[clientid].seqclient=1;
    pob[clientid].seqserver=1;
    pob[clientid].ad=remote.address;
    pob[clientid].po=remote.port;
    pob[clientid].ob=clientid;
    pob[clientid].state='idle';
    pob[clientid].px=-75;
    pob[clientid].py=40;
    pob[clientid].pz=-220;
    pob[clientid].rx=0;
    pob[clientid].ry=0;
    pob[clientid].rz=0;
    pob[clientid].at=numplayers+'aaaaaaaaaa';
    pob[clientid].iv='aaaaaaaaaa';
    pob[clientid].hz=0;
    pob[clientid].ready=0; //ready
    pob[clientid].connected=1; //connected
    pob[clientid].dc=0; //disconnect count
    qq.push({msg:'oklogin,'+sessionID+','+clientid+',1,'+clientid+',idle,'+(numplayers*2)+',2,0,0,0,0,'+numplayers+'aaaaaaaaa,aaaaaaaaaa',ad:remote.address,po:remote.port});
  } else {
    
      if (getword(message,1,',')!=sessionID) {
        console.log('*** Got client message belonging to old session!!!');
        return;
      }
      switch (true) {
        case (getword(message,0,',')=='getworld'):
          udp=message.split(","[0]);
          clientid=udp[2];
          pob[clientid].seqclient=udp[3];
          pob[clientid].seqserver++;
          qq.push({msg:'okgetworld,'+sessionID+','+clientid+','+pob[clientid].seqserver,ad:remote.address,po:remote.port});
          //console.dir(qq);
          break;   
       case (getword(message,0,',')=='state'):
          if (numplayers==1) {
             console.log('*** Got state info from player, but no other players connected');
             return;
          }
          udp=message.split(","[0]);
          qq.push({msg:message,ad:remote.address,po:remote.port});
          clientid=udp[2];
          pob[clientid].seqclient=udp[3];
          pob[clientid].state=udp[5];
          pob[clientid].px=udp[6];
          pob[clientid].py=udp[7];
          pob[clientid].pz=udp[8];
          pob[clientid].rx=udp[9];
          pob[clientid].ry=udp[10];
          pob[clientid].rz=udp[11];
          pob[clientid].at=udp[12];
          pob[clientid].iv=udp[13];
          //pob[clientid].dc=0; //reset disconnect count
          break;
       case (getword(message,0,',')=='getplayers'):
          udp=message.split(","[0]);
          clientid=udp[2];
          if (numplayers>1) {  
            var bigmsg='';
            for(var id in pob){
              //console.log(id + ': ' + pob[id].ad+','+pob[id].po);
              if (pob[id].connected==1 && pob[id].ready==1 && id!=clientid) {
                msg='okgetplayers,'+sessionID+','+clientid+',0,'+id+','+pob[id].state+','+pob[id].px+','+pob[id].py+','+pob[id].pz+','+pob[id].rx+','+pob[id].ry+','+pob[id].rz+','+pob[id].at+','+pob[id].iv;
                bigmsg+=msg+';'
                //msg='state,'+sessionID+','+clientid+',0,'+clientid+','+pob[clientid].state+','+pob[clientid].px+','+pob[clientid].py+','+pob[clientid].pz+','+pob[clientid].rx+','+pob[clientid].ry+','+pob[clientid].rz+','+pob[clientid].at+','+pob[clientid].iv;
                //bigmsg+=msg+';'
              }  
            }
            qq.push({msg:bigmsg,ad:remote.address,po:remote.port});
            // now send newplayer state info to other players
            bigmsg='';
            for(var id in pob){
              //console.log(id + ': ' + pob[id].ad+','+pob[id].po);
              if (pob[id].connected==1 && pob[id].ready==1 && id!=clientid) {
                msg='newplayer,'+sessionID+','+clientid+',0,'+clientid+','+pob[clientid].state+','+pob[clientid].px+','+pob[clientid].py+','+pob[clientid].pz+','+pob[clientid].rx+','+pob[clientid].ry+','+pob[clientid].rz+','+pob[clientid].at+','+pob[clientid].iv;
                qq.push({msg:msg,ad:pob[id].ad,po:pob[id].po});
              }  
            }
            //console.log('MSG='+bigmsg);
          } else {
            qq.push({msg:'okgetplayersnone,'+sessionID+','+clientid,ad:remote.address,po:remote.port});
          }  
          break;
       case (getword(message,0,',')=='getzombies'):
          udp=message.split(","[0]);
          clientid=udp[2];
          if (numzombies>0) {  
            var bigmsg='';
            for(var id in zob){
              msg='okgetzombies,'+sessionID+','+clientid+',0,'+id+','+zob[id].state+','+zob[id].px+','+zob[id].py+','+zob[id].pz+','+zob[id].rx+','+zob[id].ry+','+zob[id].rz+','+zob[id].at+','+zob[id].iv;
              bigmsg+=msg+';'
            }
            //console.log('MSG='+bigmsg);
            qq.push({msg:bigmsg,ad:remote.address,po:remote.port});
            if (!havezombiesender) {
                havezombiesender=true;
                pob[clientid].hz=1;//sender of zombie positions
                msg='setzombiesender,'+sessionID+','+clientid+',0'
                qq.push({msg:msg,ad:remote.address,po:remote.port});
            }  
          } else {
            qq.push({msg:'okgetzombiesnone,'+sessionID+','+clientid,ad:remote.address,po:remote.port});
          }
          pob[clientid].ready=1;
          break;
        case (getword(message,0,',')=='heartbeat'):
          udp=message.split(","[0]);
          clientid=udp[2];
          pob[clientid].ready=1;
          if (pob[clientid].connected==0) {
             pob[clientid].connected=1;
             pob[clientid].ready=1;
             pob[clientid].dc=0;
             console.log('*** RECONNECT player '+clientid);
             numplayers++;
          } else {
             pob[clientid].dc=0;
          }
          break;
          
        case (getword(message,0,',')=='zombiestate'):
          if (numplayers==1) {
             console.log('*** Got zombiestate info from player, but no other players connected');
             return;
          }
          udp=message.split(","[0]);
          //qq.push({msg:message,ad:remote.address,po:remote.port});
          clientid=udp[2];
          zombieid=udp[4];
          console.log('update pos for zombie id='+zombieid);
          
          zob[zombieid].state=udp[5];
          zob[zombieid].px=udp[6];
          zob[zombieid].py=udp[7];
          zob[zombieid].pz=udp[8];
          zob[zombieid].rx=udp[9];
          zob[zombieid].ry=udp[10];
          zob[zombieid].rz=udp[11];
          zob[zombieid].at=udp[12];
          zob[zombieid].iv=udp[13];
          //pob[clientid].dc=0; //reset disconnect count
          break;  
      
    }
    
  }
  console.log('Server got msg client (PLAYERS='+numplayers+') : '+message);    
}
function random (low, high) {
    return Math.random() * (high - low) + low;
}
function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getuid() {
  return Math.random().toString(36).substr(2, 5);
}
function getword(string,n,delim){
    var words = string.split(delim);
    if (words[n]) {
      return words[n];
    } else {
      return '';
    }
}

