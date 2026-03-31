// File: index.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const supabaseUrl = 'https://murhgcvcmfwmubrtndhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmhnY3ZjbWZ3bXVicnRuZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTMzNjEsImV4cCI6MjA5MDQ2OTM2MX0.0yuKev47bJbjN-4MlyO-rAO0hvIau7llKh6s-WKRW50';
const supabase = createClient(supabaseUrl, supabaseKey);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'portfolio_2026_secure',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function isAuthenticated(req, res, next) {
    if (req.session && req.session.isLoggedIn) return next();
    res.redirect('/login');
}

// --- ROUTES ---

// ১. হোম পেজ
app.get('/', async (req, res) => {
    const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();

    res.render('index', { 
        projects: p || [], education: e || [], achievements: a || [],
        aboutMe: ab ? ab.content : "Welcome to my portfolio!"
    });
});

// ২. লগইন
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*');
    
    if (config && config.length > 0) {
        const user = config[0];
        if (username === user.username && password === user.password) {
            req.session.isLoggedIn = true;
            return req.session.save(() => res.redirect('/admin'));
        }
    }
    res.render('login', { error: "ইউজারনেম বা পাসওয়ার্ড ভুল!" });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// ৩. এডমিন প্যানেল
app.get('/admin', isAuthenticated, async (req, res) => {
    const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();

    res.render('admin', {
        projects: p || [], education: e || [], achievements: a || [],
        aboutMe: ab ? ab.content : "", currentAdmin: "Admin"
    });
});

// --- ডেটা অপারেশনস ---

app.post('/admin/add-project', isAuthenticated, async (req, res) => {
    await supabase.from('projects').insert([{ title: req.body.title, description: req.body.description, link: req.body.link }]);
    res.redirect('/admin');
});

app.post('/admin/update-about', isAuthenticated, async (req, res) => {
    const { data: ex } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (ex) await supabase.from('about').update({ content: req.body.content }).eq('id', ex.id);
    else await supabase.from('about').insert([{ content: req.body.content }]);
    res.redirect('/admin');
});

// Delete
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => {
    await supabase.from('projects').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.listen(PORT, () => console.log(`Live at port ${PORT}`));
