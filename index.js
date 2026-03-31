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

// EJS and Static Files Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Setup
app.use(session({
    secret: 'portfolio_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}

// --- ROUTES ---

// 1. Home Page
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
    } catch (error) {
        res.send("Error loading home page.");
    }
});

// 2. Login Page
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// 3. Login Action
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();

    if (config && username === config.username && password === config.password) {
        req.session.isLoggedIn = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: "Invalid username or password!" });
    }
});

// 4. Logout Action
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// 5. Admin Dashboard
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

// --- ADMIN POST ACTIONS ---

app.post('/admin/add-project', isAuthenticated, async (req, res) => {
    await supabase.from('projects').insert([req.body]);
    res.redirect('/admin');
});

app.post('/admin/add-education', isAuthenticated, async (req, res) => {
    await supabase.from('education').insert([req.body]);
    res.redirect('/admin');
});

app.post('/admin/add-achievement', isAuthenticated, async (req, res) => {
    await supabase.from('achievements').insert([req.body]);
    res.redirect('/admin');
});

app.post('/admin/update-about', isAuthenticated, async (req, res) => {
    const { data: existing } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (existing) await supabase.from('about').update({ content: req.body.content }).eq('id', existing.id);
    else await supabase.from('about').insert([{ content: req.body.content }]);
    res.redirect('/admin');
});

// 6. Profile Update Action
app.post('/admin/update-profile', isAuthenticated, async (req, res) => {
    const { new_username, new_password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('id').limit(1).single();
    
    if (config) {
        await supabase.from('admin_config').update({ username: new_username, password: new_password }).eq('id', config.id);
        req.session.destroy();
        return res.send("<script>alert('Credentials updated! Please login again.'); window.location='/login';</script>");
    }
    res.redirect('/admin');
});

// Delete Actions
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => {
    await supabase.from('projects').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));