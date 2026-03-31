// File: index.js
const express = require('express');
const os = require('os'); // হার্ডওয়্যার ডাটা রিড করার জন্য
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// --- Real-Time Visitor Tracker ---
let totalVisitors = 1245; // আপনি চাইলে এটি 0 থেকেও শুরু করতে পারেন

// কেউ সাইটে ভিজিট করলেই কাউন্ট ১ করে বাড়বে
app.use((req, res, next) => {
    if (req.path === '/') {
        totalVisitors++;
    }
    next();
});

const PORT = process.env.PORT || 3000;

// --- SUPABASE CONFIGURATION ---
const supabaseUrl = 'https://murhgcvcmfwmubrtndhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmhnY3ZjbWZ3bXVicnRuZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTMzNjEsImV4cCI6MjA5MDQ2OTM2MX0.0yuKev47bJbjN-4MlyO-rAO0hvIau7llKh6s-WKRW50';
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer Setup for File Uploads
const upload = multer({ storage: multer.memoryStorage() });

// Express Middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Management
app.use(session({
    secret: 'mahmudul_final_secure_2026',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 Hours
}));

// Auth Guard Middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.isLoggedIn) return next();
    res.redirect('/login');
}

// --- PUBLIC ROUTES ---

// ১. হোম পেজ (সব ডাটা ফেচিং)
app.get('/', async (req, res) => {
    try {
        const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
        const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
        const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
        const { data: g } = await supabase.from('gallery').select('*').order('id', { ascending: false });
        const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();

        res.render('index', { 
            projects: p || [], 
            education: e || [], 
            achievements: a || [], 
            gallery: g || [], 
            aboutMe: ab ? ab.content : "Welcome to my portfolio!" 
        });
    } catch (err) {
        res.status(500).send("Database connection error!");
    }
});

// ২. মেসেজ পাঠানোর রুট (Contact Form)
app.post('/send-message', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await supabase.from('messages').insert([{ name, email, message }]);
        res.send("<script>alert('Message Sent Successfully!'); window.location='/#contact';</script>");
    } catch (err) {
        res.send("<script>alert('Failed to send message.'); window.location='/#contact';</script>");
    }
});

// ৩. লগইন এবং ফরগেট পাসওয়ার্ড
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: config } = await supabase.from('admin_config').select('*').limit(1).single();
    if (config && username === config.username && password === config.password) {
        req.session.isLoggedIn = true;
        return req.session.save(() => res.redirect('/admin'));
    }
    res.render('login', { error: "Invalid credentials!" });
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


// --- ADMIN ROUTES (PROTECTED) ---

// এডমিন ড্যাশবোর্ড
app.get('/admin', isAuthenticated, async (req, res) => {
    const { data: p } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: e } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: a } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: g } = await supabase.from('gallery').select('*').order('id', { ascending: false });
    const { data: m } = await supabase.from('messages').select('*').order('id', { ascending: false });
    const { data: ab } = await supabase.from('about').select('content').limit(1).maybeSingle();
    
    res.render('admin', { 
        projects: p || [], 
        education: e || [], 
        achievements: a || [], 
        gallery: g || [], 
        messages: m || [], 
        aboutMe: ab ? ab.content : "" 
    });
});

// --- Real-time Hardware & Visitor Stats API ---
app.get('/admin/api/server-stats', isAuthenticated, async (req, res) => {
    try {
        // 1. Original CPU Usage Approximation
        const cores = os.cpus().length;
        const cpuUsage = ((os.loadavg()[0] / cores) * 100).toFixed(1);

        // 2. Original RAM Usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedRam = ((totalMem - freeMem) / (1024 * 1024 * 1024)).toFixed(2);

        // 3. Send Real Data to Admin Panel
        res.json({
            cpu: cpuUsage,
            ram: usedRam,
            visitors: totalVisitors // অরিজিনাল ভিজিটর ডাটা পাঠানো হচ্ছে
        });
    } catch (error) {
        res.status(500).json({ cpu: "0", ram: "0", visitors: "0" });
    }
});


// ফটো আপলোড এবং ডেসক্রিপশন ম্যানেজমেন্ট
app.post('/admin/upload-photo', isAuthenticated, upload.single('imageFile'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.redirect('/admin');
        const fileName = `${Date.now()}_${file.originalname.replace(/\s/g, '_')}`;
        
        await supabase.storage.from('portfolio_gallery').upload(fileName, file.buffer, { contentType: file.mimetype });
        const { data: urlData } = supabase.storage.from('portfolio_gallery').getPublicUrl(fileName);
        
        await supabase.from('gallery').insert([{ 
            image_url: urlData.publicUrl, 
            caption: req.body.caption, 
            description: req.body.description 
        }]);
        res.redirect('/admin');
    } catch (err) { res.send(err.message); }
});

app.post('/admin/update-photo/:id', isAuthenticated, async (req, res) => {
    await supabase.from('gallery').update({ 
        caption: req.body.caption, 
        description: req.body.description 
    }).eq('id', req.params.id);
    res.redirect('/admin');
});

app.post('/admin/delete-photo/:id', isAuthenticated, async (req, res) => {
    await supabase.from('gallery').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

// ইনবক্স মেসেজ ডিলিট
app.post('/admin/delete-message/:id', isAuthenticated, async (req, res) => {
    await supabase.from('messages').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

// --- EDUCATION ROUTES (Add, Update, Delete) ---
app.post('/admin/add-education', isAuthenticated, async (req, res) => { await supabase.from('education').insert([req.body]); res.redirect('/admin'); });
app.post('/admin/update-education/:id', isAuthenticated, async (req, res) => { 
    await supabase.from('education').update({ degree: req.body.degree, institution: req.body.institution, year: req.body.year }).eq('id', req.params.id); 
    res.redirect('/admin'); 
});
app.post('/admin/delete-education/:id', isAuthenticated, async (req, res) => { await supabase.from('education').delete().eq('id', req.params.id); res.redirect('/admin'); });

// --- PROJECT ROUTES (Add, Update, Delete) ---
app.post('/admin/add-project', isAuthenticated, async (req, res) => { await supabase.from('projects').insert([req.body]); res.redirect('/admin'); });
app.post('/admin/update-project/:id', isAuthenticated, async (req, res) => { 
    await supabase.from('projects').update({ title: req.body.title, description: req.body.description }).eq('id', req.params.id); 
    res.redirect('/admin'); 
});
app.post('/admin/delete-project/:id', isAuthenticated, async (req, res) => { await supabase.from('projects').delete().eq('id', req.params.id); res.redirect('/admin'); });

// --- ACHIEVEMENT ROUTES (Add, Update, Delete) ---
app.post('/admin/add-achievement', isAuthenticated, async (req, res) => { await supabase.from('achievements').insert([req.body]); res.redirect('/admin'); });
app.post('/admin/update-achievement/:id', isAuthenticated, async (req, res) => { 
    await supabase.from('achievements').update({ title: req.body.title, year: req.body.year }).eq('id', req.params.id); 
    res.redirect('/admin'); 
});
app.post('/admin/delete-achievement/:id', isAuthenticated, async (req, res) => { await supabase.from('achievements').delete().eq('id', req.params.id); res.redirect('/admin'); });

// বায়ো আপডেট
app.post('/admin/update-about', isAuthenticated, async (req, res) => {
    const { data: ex } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (ex) await supabase.from('about').update({ content: req.body.content }).eq('id', ex.id);
    else await supabase.from('about').insert([{ content: req.body.content }]);
    res.redirect('/admin');
});

// এডমিন প্রোফাইল এবং পাসওয়ার্ড আপডেট
app.post('/admin/update-profile', isAuthenticated, async (req, res) => {
    const { new_username, new_password, new_secret } = req.body;
    const { data: config } = await supabase.from('admin_config').select('id').limit(1).single();
    if (config) {
        await supabase.from('admin_config').update({ 
            username: new_username, 
            password: new_password, 
            secret_answer: new_secret 
        }).eq('id', config.id);
        req.session.destroy(() => res.send("<script>alert('Security Updated! Please login again.'); window.location='/login';</script>"));
    }
});

// লগআউট
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// সার্ভার স্টার্ট
app.listen(PORT, () => console.log(`Mahmudul Portfolio is running on port ${PORT}`));
