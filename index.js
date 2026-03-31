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
    secret: 'portfolio_secure_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function isAuthenticated(req, res, next) {
    if (req.session && req.session.isLoggedIn) return next();
    res.redirect('/login');
}

// --- ROUTES ---

// ১. হোম পেজ (ডেটা দেখানো)
app.get('/', async (req, res) => {
    try {
        const { data: projects } = await supabase.from('projects').select('*').order('id', { ascending: false });
        const { data: education } = await supabase.from('education').select('*').order('id', { ascending: false });
        const { data: achievements } = await supabase.from('achievements').select('*').order('id', { ascending: false });
        const { data: about } = await supabase.from('about').select('content').limit(1).maybeSingle();

        res.render('index', { 
            projects: projects || [],
            education: education || [],
            achievements: achievements || [],
            aboutMe: about ? about.content : "Welcome to my portfolio!"
        });
    } catch (e) { res.send("Error!"); }
});

// ২. লগইন
app.get('/login', (req, res) => {
    if (req.session.isLoggedIn) return res.redirect('/admin');
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();
    if (config && username === config.username && password === config.password) {
        req.session.isLoggedIn = true;
        req.session.save(() => res.redirect('/admin'));
    } else {
        res.render('login', { error: "ইউজারনেম বা পাসওয়ার্ড ভুল!" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// ৩. এডমিন প্যানেল
app.get('/admin', isAuthenticated, async (req, res) => {
    const { data: projects } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: education } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: achievements } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: about } = await supabase.from('about').select('content').limit(1).maybeSingle();
    const { data: config } = await supabase.from('admin_config').select('username').limit(1).single();

    res.render('admin', {
        projects: projects || [],
        education: education || [],
        achievements: achievements || [],
        aboutMe: about ? about.content : "",
        currentAdmin: config ? config.username : "admin"
    });
});

// --- ডেটা আপডেট করার অ্যাকশনসমূহ (Fixed) ---

app.post('/admin/add-project', isAuthenticated, async (req, res) => {
    const { title, description, link } = req.body;
    await supabase.from('projects').insert([{ title, description, link }]);
    res.redirect('/admin');
});

app.post('/admin/add-education', isAuthenticated, async (req, res) => {
    const { degree, institution, year } = req.body;
    await supabase.from('education').insert([{ degree, institution, year }]);
    res.redirect('/admin');
});

app.post('/admin/add-achievement', isAuthenticated, async (req, res) => {
    const { title, year } = req.body;
    await supabase.from('achievements').insert([{ title, year }]);
    res.redirect('/admin');
});

app.post('/admin/update-about', isAuthenticated, async (req, res) => {
    const { content } = req.body;
    const { data: existing } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (existing) await supabase.from('about').update({ content }).eq('id', existing.id);
    else await supabase.from('about').insert([{ content }]);
    res.redirect('/admin');
});

app.post('/admin/update-profile', isAuthenticated, async (req, res) => {
    const { new_username, new_password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('id').limit(1).single();
    if (config) {
        await supabase.from('admin_config').update({ username: new_username, password: new_password }).eq('id', config.id);
        req.session.destroy(() => res.send("<script>alert('Updated! Login again.'); window.location='/login';</script>"));
    }
});

// Delete
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => {
    await supabase.from('projects').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.listen(PORT, () => console.log(`Live: http://localhost:${PORT}`));
