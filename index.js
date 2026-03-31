// File: index.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const supabaseUrl = 'https://murhgcvcmfwmubrtndhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmhnY3ZjbWZ3bXVicnRuZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTMzNjEsImV4cCI6MjA5MDQ2OTM2MX0.0yuKev47bJbjN-4MlyO-rAO0hvIau7llKh6s-WKRW50';
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer Setup (Memory Storage for Buffer)
const upload = multer({ storage: multer.memoryStorage() });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'mahmudul_portfolio_secure_2026',
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

// ১. হোম পেজ
app.get('/', async (req, res) => {
    try {
        const { data: stats } = await supabase.from('site_stats').select('*').limit(1).single();
        if (stats) await supabase.from('site_stats').update({ visitor_count: stats.visitor_count + 1 }).eq('id', stats.id);

        const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
        const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
        const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
        const { data: g } = await supabase.from('gallery').select('*').order('id', { ascending: false });
        const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();

        res.render('index', { 
            projects: p || [], education: e || [], achievements: a || [], 
            gallery: g || [], aboutMe: ab ? ab.content : "Welcome to my portfolio!",
            userName: "Mahmudul Hasan"
        });
    } catch (err) { res.send("Error loading database."); }
});

// ২. লগইন ও সিকিউরিটি
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();
    if (config && username === config.username && password === config.password) {
        req.session.isLoggedIn = true;
        return req.session.save(() => res.redirect('/admin'));
    }
    res.render('login', { error: "Invalid username or password!" });
});

app.get('/forgot-password', (req, res) => res.render('forgot-password', { error: null }));
app.post('/forgot-password', async (req, res) => {
    const { secret_answer, new_password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();
    if (config && secret_answer === config.secret_answer) {
        await supabase.from('admin_config').update({ password: new_password }).eq('id', config.id);
        return res.send("<script>alert('Password Reset Successful!'); window.location='/login';</script>");
    }
    res.render('forgot-password', { error: "Wrong Secret Code!" });
});

// ৩. এডমিন প্যানেল
app.get('/admin', isAuthenticated, async (req, res) => {
    const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: g } = await supabase.from('gallery').select('*').order('id', { ascending: false });
    const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();
    const { data: conf } = await supabase.from('admin_config').select('*').limit(1).single();

    res.render('admin', { 
        projects: p || [], education: e || [], achievements: a || [], 
        gallery: g || [], aboutMe: ab ? ab.content : "", currentAdmin: conf ? conf.username : "Admin" 
    });
});

// ৪. সিস্টেম স্ট্যাটাস API
app.get('/api/stats', async (req, res) => {
    const { data: stats } = await supabase.from('site_stats').select('visitor_count').limit(1).single();
    res.json({ cpu: (Math.random()*6+4).toFixed(1), ramUsed: "1.1", ramTotal: "2.0", sysLoad: "0.42", visitors: stats ? stats.visitor_count : 0 });
});

// --- ফটো আপলোড লজিক (STORAGE) ---
app.post('/admin/upload-photo', isAuthenticated, upload.single('imageFile'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.send("No file selected!");

        const fileName = `${Date.now()}_${file.originalname.replace(/\s/g, '_')}`;

        // আপলোড টু স্টোরেজ
        const { error: uploadError } = await supabase.storage
            .from('portfolio_gallery')
            .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        // পাবলিক ইউআরএল জেনারেট
        const { data: publicUrlData } = supabase.storage.from('portfolio_gallery').getPublicUrl(fileName);
        const imageUrl = publicUrlData.publicUrl;

        // ডাটাবেসে সেভ
        await supabase.from('gallery').insert([{ image_url: imageUrl, caption: req.body.caption }]);
        res.redirect('/admin');
    } catch (err) { res.send("Upload failed: " + err.message); }
});

// --- ডিলিট এবং আপডেট অপারেশনস ---
app.post('/admin/delete-photo/:id', isAuthenticated, async (req, res) => {
    await supabase.from('gallery').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

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
        req.session.destroy(() => res.send("<script>alert('Account Updated!'); window.location='/login';</script>"));
    }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));
app.listen(PORT, () => console.log(`Mahmudul Portfolio Live on ${PORT}`));
