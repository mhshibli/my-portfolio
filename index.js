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
    secret: 'portfolio_final_secure_2026',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// সেশন চেক করার ফাংশন
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

// ৩. এডমিন ড্যাশবোর্ড
app.get('/admin', isAuthenticated, async (req, res) => {
    const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();
    const { data: conf } = await supabase.from('admin_config').select('username').limit(1).single();

    res.render('admin', {
        projects: p || [], education: e || [], achievements: a || [],
        aboutMe: ab ? ab.content : "", currentAdmin: conf ? conf.username : "Admin"
    });
});

// ৪. স্ট্যাটাস API (Vercel/Render এর জন্য ফিক্সড)
app.get('/api/stats', (req, res) => {
    res.json({
        cpu: (Math.random() * (15 - 5) + 5).toFixed(1), // রিয়েল টাইম ফিল দেওয়ার জন্য
        ramUsed: "1.2",
        ramTotal: "2.0",
        sysLoad: "0.45",
        visitors: "Live"
    });
});

// --- ডেটা অপারেশনস ---

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

// প্রোফাইল আপডেট (Fix: পাসওয়ার্ড চেঞ্জ লজিক)
app.post('/admin/update-profile', isAuthenticated, async (req, res) => {
    const { new_username, new_password } = req.body;
    // সব ডাটাবেসে সাধারণত প্রথম ইউজারের আইডি ১ হয়
    const { data: config } = await supabase.from('admin_config').select('id').limit(1).single();
    
    if (config) {
        const { error } = await supabase
            .from('admin_config')
            .update({ username: new_username, password: new_password })
            .eq('id', config.id);

        if (!error) {
            req.session.destroy(() => {
                res.send("<script>alert('Updated! Please login again.'); window.location='/login';</script>");
            });
        } else {
            res.send("Update failed!");
        }
    } else {
        res.send("No admin config found in database!");
    }
});

// ডিলিট অপারেশন
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => {
    await supabase.from('projects').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
