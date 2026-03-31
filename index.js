// File: index.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = 'https://murhgcvcmfwmubrtndhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmhnY3ZjbWZ3bXVicnRuZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTMzNjEsImV4cCI6MjA5MDQ2OTM2MX0.0yuKev47bJbjN-4MlyO-rAO0hvIau7llKh6s-WKRW50';
const supabase = createClient(supabaseUrl, supabaseKey);

const upload = multer({ storage: multer.memoryStorage() });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'mahmudul_final_secure_2026',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function isAuthenticated(req, res, next) {
    if (req.session && req.session.isLoggedIn) return next();
    res.redirect('/login');
}

// --- ROUTES ---
app.get('/', async (req, res) => {
    try {
        const { data: stats } = await supabase.from('site_stats').select('*').limit(1).single();
        if (stats) await supabase.from('site_stats').update({ visitor_count: stats.visitor_count + 1 }).eq('id', stats.id);

        const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
        const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
        const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
        const { data: g } = await supabase.from('gallery').select('*').order('id', { ascending: false });
        const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();

        res.render('index', { projects: p || [], education: e || [], achievements: a || [], gallery: g || [], aboutMe: ab ? ab.content : "" });
    } catch (err) { res.send("Error!"); }
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();
    if (config && username === config.username && password === config.password) {
        req.session.isLoggedIn = true;
        return req.session.save(() => res.redirect('/admin'));
    }
    res.render('login', { error: "Login failed!" });
});

app.get('/admin', isAuthenticated, async (req, res) => {
    const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: g } = await supabase.from('gallery').select('*').order('id', { ascending: false });
    const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();
    const { data: conf } = await supabase.from('admin_config').select('*').limit(1).single();

    res.render('admin', { projects: p || [], education: e || [], achievements: a || [], gallery: g || [], aboutMe: ab ? ab.content : "", currentAdmin: conf ? conf.username : "Admin" });
});

app.get('/api/stats', async (req, res) => {
    const { data: stats } = await supabase.from('site_stats').select('visitor_count').limit(1).single();
    res.json({ cpu: (Math.random()*5+2).toFixed(1), ramUsed: "1.1", ramTotal: "2.0", sysLoad: "0.35", visitors: stats ? stats.visitor_count : 0 });
});

// Photo Upload to Storage
app.post('/admin/upload-photo', isAuthenticated, upload.single('imageFile'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.send("No file!");
        const fileName = `${Date.now()}_${file.originalname}`;
        await supabase.storage.from('portfolio_gallery').upload(fileName, file.buffer, { contentType: file.mimetype });
        const { data: urlData } = supabase.storage.from('portfolio_gallery').getPublicUrl(fileName);
        await supabase.from('gallery').insert([{ image_url: urlData.publicUrl, caption: req.body.caption, description: req.body.description }]);
        res.redirect('/admin');
    } catch (err) { res.send(err.message); }
});

// Photo Detail Update
app.post('/admin/update-photo/:id', isAuthenticated, async (req, res) => {
    await supabase.from('gallery').update({ caption: req.body.caption, description: req.body.description }).eq('id', req.params.id);
    res.redirect('/admin');
});

// Basic Operations
app.post('/admin/delete-photo/:id', isAuthenticated, async (req, res) => { await supabase.from('gallery').delete().eq('id', req.params.id); res.redirect('/admin'); });
app.post('/admin/add-project', isAuthenticated, async (req, res) => { await supabase.from('projects').insert([req.body]); res.redirect('/admin'); });
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => { await supabase.from('projects').delete().eq('id', req.params.id); res.redirect('/admin'); });
app.post('/admin/add-education', isAuthenticated, async (req, res) => { await supabase.from('education').insert([req.body]); res.redirect('/admin'); });
app.post('/admin/delete-education/:id', isAuthenticated, async (req, res) => { await supabase.from('education').delete().eq('id', req.params.id); res.redirect('/admin'); });
app.post('/admin/add-achievement', isAuthenticated, async (req, res) => { await supabase.from('achievements').insert([req.body]); res.redirect('/admin'); });
app.post('/admin/delete-achievement/:id', isAuthenticated, async (req, res) => { await supabase.from('achievements').delete().eq('id', req.params.id); res.redirect('/admin'); });
app.post('/admin/update-about', isAuthenticated, async (req, res) => {
    const { data: ex } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (ex) await supabase.from('about').update({ content: req.body.content }).eq('id', ex.id);
    else await supabase.from('about').insert([{ content: req.body.content }]);
    res.redirect('/admin');
});
app.post('/admin/update-profile', isAuthenticated, async (req, res) => {
    const { new_username, new_password, new_secret } = req.body;
    const { data: config } = await supabase.from('admin_config').select('id').limit(1).single();
    if (config) {
        await supabase.from('admin_config').update({ username: new_username, password: new_password, secret_answer: new_secret }).eq('id', config.id);
        req.session.destroy(() => res.send("<script>alert('Updated!'); window.location='/login';</script>"));
    }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));
app.listen(PORT, () => console.log(`Live on ${PORT}`));
