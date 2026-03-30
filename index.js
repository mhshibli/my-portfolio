// File: index.js
const express = require('express');
const os = require('os');
const osUtils = require('os-utils');
const db = require('./db');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let visitorCount = 0;
app.use((req, res, next) => {
    if (req.path === '/') visitorCount++;
    next();
});

// 1. Home Route
app.get('/', (req, res) => {
    db.all("SELECT * FROM projects ORDER BY id DESC", [], (err1, projects) => {
        db.all("SELECT * FROM education ORDER BY id DESC", [], (err2, education) => {
            db.all("SELECT * FROM achievements ORDER BY id DESC", [], (err3, achievements) => {
                db.get("SELECT * FROM about ORDER BY id DESC LIMIT 1", [], (err4, about) => {
                    res.render('index', { 
                        projects: projects || [],
                        education: education || [],
                        achievements: achievements || [],
                        aboutMe: about ? about.content : "Hello! I am a passionate professional. Welcome to my portfolio website."
                    }); 
                });
            });
        });
    });
});

// 2. Admin Dashboard Route
app.get('/admin', (req, res) => {
    db.all("SELECT * FROM projects ORDER BY id DESC", [], (err1, projects) => {
        db.all("SELECT * FROM education ORDER BY id DESC", [], (err2, education) => {
            db.all("SELECT * FROM achievements ORDER BY id DESC", [], (err3, achievements) => {
                db.get("SELECT * FROM about ORDER BY id DESC LIMIT 1", [], (err4, about) => {
                    res.render('admin', {
                        projects: projects || [],
                        education: education || [],
                        achievements: achievements || [],
                        aboutMe: about ? about.content : ""
                    });
                });
            });
        });
    });
});

// 3. API Stats
app.get('/api/stats', (req, res) => {
    osUtils.cpuUsage((cpuPercent) => {
        const totalRam = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const freeRam = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedRam = (totalRam - freeRam).toFixed(2);
        res.json({
            cpu: (cpuPercent * 100).toFixed(1),
            ramUsed: usedRam,
            ramTotal: totalRam,
            sysLoad: os.loadavg()[0].toFixed(2),
            visitors: visitorCount
        });
    });
});

// ======================== ADD CONTENT ========================
app.post('/admin/add-project', (req, res) => {
    db.run(`INSERT INTO projects (title, description, link) VALUES (?, ?, ?)`, [req.body.title, req.body.description, req.body.link], () => res.redirect('/admin'));
});

app.post('/admin/add-education', (req, res) => {
    db.run(`INSERT INTO education (degree, institution, year, description) VALUES (?, ?, ?, ?)`, [req.body.degree, req.body.institution, req.body.year, req.body.description], () => res.redirect('/admin'));
});

app.post('/admin/add-achievement', (req, res) => {
    db.run(`INSERT INTO achievements (title, year, description) VALUES (?, ?, ?)`, [req.body.title, req.body.year, req.body.description], () => res.redirect('/admin'));
});

// ======================== UPDATE ABOUT ME ========================
app.post('/admin/update-about', (req, res) => {
    db.get("SELECT * FROM about LIMIT 1", [], (err, row) => {
        if (row) {
            db.run(`UPDATE about SET content = ? WHERE id = ?`, [req.body.content, row.id], () => res.redirect('/admin'));
        } else {
            db.run(`INSERT INTO about (content) VALUES (?)`, [req.body.content], () => res.redirect('/admin'));
        }
    });
});

// ======================== DELETE CONTENT ========================
app.post('/admin/delete-project/:id', (req, res) => {
    db.run(`DELETE FROM projects WHERE id = ?`, req.params.id, () => res.redirect('/admin'));
});

app.post('/admin/delete-education/:id', (req, res) => {
    db.run(`DELETE FROM education WHERE id = ?`, req.params.id, () => res.redirect('/admin'));
});

app.post('/admin/delete-achievement/:id', (req, res) => {
    db.run(`DELETE FROM achievements WHERE id = ?`, req.params.id, () => res.redirect('/admin'));
});

// ======================== EDIT/UPDATE CONTENT ========================
app.get('/admin/edit/:type/:id', (req, res) => {
    const { type, id } = req.params;
    let table = type === 'project' ? 'projects' : (type === 'education' ? 'education' : 'achievements');
    
    db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row) => {
        if (row) res.render('edit', { type, item: row });
        else res.redirect('/admin');
    });
});

app.post('/admin/update-project/:id', (req, res) => {
    db.run(`UPDATE projects SET title=?, description=?, link=? WHERE id=?`, [req.body.title, req.body.description, req.body.link, req.params.id], () => res.redirect('/admin'));
});

app.post('/admin/update-education/:id', (req, res) => {
    db.run(`UPDATE education SET degree=?, institution=?, year=?, description=? WHERE id=?`, [req.body.degree, req.body.institution, req.body.year, req.body.description, req.params.id], () => res.redirect('/admin'));
});

app.post('/admin/update-achievement/:id', (req, res) => {
    db.run(`UPDATE achievements SET title=?, year=?, description=? WHERE id=?`, [req.body.title, req.body.year, req.body.description, req.params.id], () => res.redirect('/admin'));
});

app.listen(PORT, () => {
    console.log(`Server is running at: http://localhost:${PORT}`);
});