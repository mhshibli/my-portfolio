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

// Middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Setup
app.use(session({
    secret: 'portfolio_final_secure_2026',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth Middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.isLoggedIn) return next();
    res.redirect('/login');
}

// --- ROUTES ---

// ১. হোম পেজ (ভিজিটর কাউন্টার লজিক সহ)
app.get('/', async (req, res) => {
    try {
        // ভিজিটর সংখ্যা ১ বাড়ানো
        const { data: currentStats } = await supabase.from('site_stats').select('*').limit(1).single();
        if (currentStats) {
            await supabase.from('site_stats').update({ visitor_count: currentStats.visitor_count + 1 }).eq('id', currentStats.id);
        }

        const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
        const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
        const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
        const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();

        res.render('index', { 
            projects: p || [], education: e || [], achievements: a || [],
            aboutMe: ab ? ab.content : "Welcome to my portfolio!"
        });
    } catch (err) {
        res.send("Error loading site. Please check database tables.");
    }
});

// ২. লগইন ও লগআউট
app.get('/login', (req, res) => {
    if (req.session.isLoggedIn) return res.redirect('/admin');
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();
        if (config && username === config.username && password === config.password) {
            req.session.isLoggedIn = true;
            return req.session.save(() => res.redirect('/admin'));
        } else {
            res.render('login', { error: "ইউজারনেম বা পাসওয়ার্ড ভুল!" });
        }
    } catch (e) {
        res.render('login', { error: "Database error!" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// ৩. এডমিন ড্যাশবোর্ড
app.get('/admin', isAuthenticated, async (req, res) => {
    try {
        const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
        const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
        const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
        const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();
        const { data: conf } = await supabase.from('admin_config').select('username').limit(1).single();

        res.render('admin', {
            projects: p || [], education: e || [], achievements: a || [],
            aboutMe: ab ? ab.content : "", currentAdmin: conf ? conf.username : "Admin"
        });
    } catch (err) {
        res.redirect('/logout');
    }
});

// ৪. স্ট্যাটাস API (ড্যাশবোর্ডের গ্রাফ ও ভিজিটর সংখ্যার জন্য)
app.get('/api/stats', async (req, res) => {
    try {
        const { data: stats } = await supabase.from('site_stats').select('visitor_count').limit(1).single();
        res.json({
            cpu: (Math.random() * (12 - 4) + 4).toFixed(1),
            ramUsed: "1.1",
            ramTotal: "2.0",
            sysLoad: "0.42",
            visitors: stats ? stats.visitor_count : 0
        });
    } catch (e) {
        res.json({ cpu: 0, ramUsed: 0, ramTotal: 0, sysLoad: 0, visitors: 0 });
    }
});

// --- ডেটা অপারেশনস (ADD) ---
app.post('/admin/add-project', isAuthenticated, async (req, res) => {
    await supabase.from('projects').insert([{ title: req.body.title, description: req.body.description, link: req.body.link }]);
    res.redirect('/admin');
});

app.post('/admin/add-education', isAuthenticated, async (req, res) => {
    await supabase.from('education').insert([{ degree: req.body.degree, institution: req.body.institution, year: req.body.year }]);
    res.redirect('/admin');
});

app.post('/admin/add-achievement', isAuthenticated, async (req, res) => {
    await supabase.from('achievements').insert([{ title: req.body.title, year: req.body.year }]);
    res.redirect('/admin');
});

app.post('/admin/update-about', isAuthenticated, async (req, res) => {
    const { data: ex } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (ex) await supabase.from('about').update({ content: req.body.content }).eq('id', ex.id);
    else await supabase.from('about').insert([{ content: req.body.content }]);
    res.redirect('/admin');
});

// প্রোফাইল আপডেট (পাসওয়ার্ড ও ইউজারনেম)
app.post('/admin/update-profile', isAuthenticated, async (req, res) => {
    const { new_username, new_password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('id').limit(1).single();
    if (config) {
        await supabase.from('admin_config').update({ username: new_username, password: new_password }).eq('id', config.id);
        req.session.destroy(() => res.send("<script>alert('Credentials Updated! Login again.'); window.location='/login';</script>"));
    }
});

// --- ডেটা অপারেশনস (DELETE) ---
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => {
    await supabase.from('projects').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.post('/admin/delete-education/:id', isAuthenticated, async (req, res) => {
    await supabase.from('education').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.post('/admin/delete-achievement/:id', isAuthenticated, async (req, res) => {
    await supabase.from('achievements').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
