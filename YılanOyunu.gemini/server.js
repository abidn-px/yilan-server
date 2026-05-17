const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" } // Herkes bağlanabilsin diye lo
});

const GENISLIK = 40;
const YUKSEKLIK = 30;

let oyuncular = {};
let yemler = [];
const maksimumYem = 30;

function yemSerp() {
    while (yemler.length < maksimumYem) {
        yemler.push({
            id: Math.random().toString(),
            x: Math.floor(Math.random() * GENISLIK),
            y: Math.floor(Math.random() * YUKSEKLIK)
        });
    }
}
yemSerp();

io.on('connection', (socket) => {
    // Yeni bir bebe odaya girdi lo
    oyuncular[socket.id] = {
        id: socket.id,
        ad: "Bebe_" + socket.id.substring(0, 4),
        govde: [{x: Math.floor(Math.random() * 30) + 5, y: Math.floor(Math.random() * 20) + 5}],
        yon: "SAG",
        renk: "#" + Math.floor(Math.random()*16777215).toString(16),
        skor: 0,
        canli: true
    };
    
    // Kuyruk verelim cücük gibi kalmasın
    for(let i=1; i<5; i++) {
        oyuncular[socket.id].govde.push({...oyuncular[socket.id].govde[0]});
    }

    socket.emit('baslangic', { id: socket.id });

    socket.on('yonDegis', (yeniYon) => {
        let o = oyuncular[socket.id];
        if (!o || !o.canli) return;
        if (yeniYon === "YUKARI" && o.yon !== "ASAGI") o.yon = "YUKARI";
        if (yeniYon === "ASAGI" && o.yon !== "YUKARI") o.yon = "ASAGI";
        if (yeniYon === "SOL" && o.yon !== "SAG") o.yon = "SOL";
        if (yeniYon === "SAG" && o.yon !== "SOL") o.yon = "SAG";
    });

    socket.on('disconnect', () => {
        delete oyuncular[socket.id];
    });
});

// Oyun döngüsü lo
setInterval(() => {
    Object.keys(oyuncular).forEach(id => {
        let o = oyuncular[id];
        if (!o.canli) return;

        let kafa = { ...o.govde[0] };
        if (o.yon === "SAG") kafa.x++;
        if (o.yon === "SOL") kafa.x--;
        if (o.yon === "YUKARI") kafa.y--;
        if (o.yon === "ASAGI") kafa.y++;

        if (kafa.x < 0 || kafa.x >= GENISLIK || kafa.y < 0 || kafa.y >= YUKSEKLIK) {
            o.canli = false; return;
        }

        o.govde.unshift(kafa);

        let yemYedi = false;
        for (let i = yemler.length - 1; i >= 0; i--) {
            if (kafa.x === yemler[i].x && kafa.y === yemler[i].y) {
                yemler.splice(i, 1); o.skor += 10; yemYedi = true; break;
            }
        }
        if (!yemYedi) o.govde.pop();
    });

    // Çarpışma kontrolü la
    Object.keys(oyuncular).forEach(id1 => {
        let o1 = oyuncular[id1]; if (!o1.canli) return;
        let kafa1 = o1.govde[0];

        Object.keys(oyuncular).forEach(id2 => {
            let o2 = oyuncular[id2]; if (!o2.canli) return;
            o2.govde.forEach((parca, indeks) => {
                if (id1 === id2 && indeks === 0) return;
                if (kafa1.x === parca.x && kafa1.y === parca.y) o1.canli = false;
            });
        });
    });

    yemSerp();
    io.emit('guncelleme', { oyuncular, yemler });
}, 100);

// Render için port ayarı lo
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda hazır lo!`);
});