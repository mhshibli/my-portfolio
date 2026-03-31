// File: index.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer'); // ফাইল হ্যান্ডলিংয়ের জন্য
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const supabaseUrl = 'https://murhgcvcmfwmubrtndhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmhnY3ZjbWZ3bXVicnRuZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTMzNjEsImV4cCI6MjA5MDQ2OTM2MX0.0yuKev47bJbjN-4MlyO-rAO0hvIau7llKh6s-WKRW50';
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer Setup (মেমোরিতে ফাইল রাখার জন্য)
const upload = multer({ storage: multer.memoryStorage() });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'mahmudul_secure_2026',
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
    const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: g } = await supabase.from('gallery').select('*').order('id', { ascending: false });
    const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();

    res.render('index', { 
        projects: p || [], education: e || [], achievements: a || [], 
        gallery: g || [], aboutMe: ab ? ab.content : "" 
    });
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();
    if (config && username === config.username && password === config.password) {
        req.session.isLoggedIn = true;
        return req.session.save(() => res.redirect('/admin'));
    }
    res.render('login', { error: "Invalid login!" });
});

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

// --- STORAGE PHOTO UPLOAD (মেইন পরিবর্তন এখানে) ---
app.post('/admin/upload-photo', isAuthenticated, upload.single('imageFile'), async (req, res) => {
    try {
        const file = req.file;
        const caption = req.body.caption;

        if (!file) return res.send("No file uploaded!");

        // ১. ফাইল নাম তৈরি করা (Unique name)
        const fileName = `${Date.now()}_${file.originalname}`;

        // ২. Supabase Storage এ আপলোড করা
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('portfolio_gallery')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) throw uploadError;

        // ৩. ফাইলের পাবলিক URL আনা
        const { data: publicUrlData } = supabase.storage
            .from('portfolio_gallery')
            .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        // ৪. ডাটাবেসে URL সেভ করা (Table: gallery)
        await supabase.from('gallery').insert([{ image_url: imageUrl, caption: caption }]);

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send("Upload failed: " + err.message);
    }
});

// ডিলিট অপারেশন (ফটো ডিলিট লজিক সহ)
app.post('/admin/delete-photo/:id', isAuthenticated, async (req, res) => {
    // ডাটাবেস থেকে ডিলিট
    await supabase.from('gallery').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

// অন্যান্য অপারেশন আগের মতোই থাকবে (Projects, Education, etc.)
app.post('/admin/add-project', isAuthenticated, async (req, res) => { await supabase.from('projects').insert([req.body]); res.redirect('/admin'); });
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => { await supabase.from('projects').delete().eq('id', req.params.id); res.redirect('/admin'); });

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));
app.listen(PORT, () => console.log(`Server at ${PORT}`));
