import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

const rooms = new Map();
const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const makeTarget = () => ({ id: crypto.randomUUID(), x: 8 + Math.random()*84, y: 10 + Math.random()*80 });
function freshRoom() { return { players:{}, target:makeTarget(), started:false, endsAt:0, timer:null }; }
function publicState(room) { return { players: room.players, target: room.target, started: room.started, endsAt: room.endsAt }; }
function broadcast(code) { const r=rooms.get(code); if(r) io.to(code).emit('state', publicState(r)); }
function endGame(code) {
  const r=rooms.get(code); if(!r) return;
  r.started=false; if(r.timer) clearTimeout(r.timer); r.timer=null;
  const ps=Object.values(r.players); const winner = ps[0]?.score===ps[1]?.score ? 'draw' : (ps[0]?.score>ps[1]?.score ? ps[0].id : ps[1].id);
  io.to(code).emit('gameOver',{winner,scores:ps.map(p=>({id:p.id,name:p.name,score:p.score}))});
  broadcast(code);
}
io.on('connection', socket => {
  socket.on('createRoom', ({name='Player 1'}={}) => {
    let code; do code=makeCode(); while(rooms.has(code));
    const r=freshRoom(); r.players[socket.id]={id:socket.id,name:String(name).slice(0,16)||'Player 1',score:0}; rooms.set(code,r);
    socket.join(code); socket.data.code=code; socket.emit('roomCreated',{code,playerId:socket.id}); broadcast(code);
  });
  socket.on('joinRoom', ({code,name='Player 2'}={}) => {
    code=String(code||'').trim().toUpperCase(); const r=rooms.get(code);
    if(!r) return socket.emit('errorMessage','Room not found. Check the code.');
    if(Object.keys(r.players).length>=2) return socket.emit('errorMessage','That room is full.');
    r.players[socket.id]={id:socket.id,name:String(name).slice(0,16)||'Player 2',score:0}; socket.join(code); socket.data.code=code;
    socket.emit('joined',{code,playerId:socket.id}); broadcast(code);
  });
  socket.on('startGame',()=>{
    const code=socket.data.code, r=rooms.get(code); if(!r || Object.keys(r.players).length!==2) return;
    if(r.started) return; r.started=true; r.endsAt=Date.now()+60000; r.target=makeTarget(); Object.values(r.players).forEach(p=>p.score=0);
    broadcast(code); r.timer=setTimeout(()=>endGame(code),60000);
  });
  socket.on('collect', ({targetId}={})=>{
    const code=socket.data.code, r=rooms.get(code); if(!r || !r.started || r.target.id!==targetId) return;
    const p=r.players[socket.id]; if(!p) return; p.score++; r.target=makeTarget(); broadcast(code);
  });
  socket.on('disconnect',()=>{
    const code=socket.data.code, r=rooms.get(code); if(!r) return;
    delete r.players[socket.id]; if(r.timer) clearTimeout(r.timer);
    if(Object.keys(r.players).length===0) rooms.delete(code); else { r.started=false; r.timer=null; broadcast(code); }
  });
});
const port=process.env.PORT||3000; server.listen(port,()=>console.log(`Duel Dash listening on ${port}`));
