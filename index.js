// File: index.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Connection (আপনার নিজের URL এবং Key এখানে বসান)
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

app.set('view engine', 'ejs');
app.set('views', './views'); // Vercel এর জন্য এটি দরকার
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- ROUTES ---

// 1. Home Route
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
        res.status(500).send("Database Error: " + error.message);
    }
});

// 2. Admin Route
app.get('/admin', async (req, res) => {
    const { data: projects } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: education } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: achievements } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: about } = await supabase.from('about').select('content').limit(1).maybeSingle();

    res.render('admin', {
        projects: projects || [],
        education: education || [],
        achievements: achievements || [],
        aboutMe: about ? about.content : ""
    });
});

// 3. Fake Stats for Vercel (Vercel doesn't allow real-time server stats)
app.get('/api/stats', (req, res) => {
    res.json({
        cpu: "Cloud",
        ramUsed: "Shared",
        ramTotal: "Serverless",
        sysLoad: "N/A",
        visitors: "Live"
    });
});

// 4. Update About Me
app.post('/admin/update-about', async (req, res) => {
    const { data: existing } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (existing) {
        await supabase.from('about').update({ content: req.body.content }).eq('id', existing.id);
    } else {
        await supabase.from('about').insert([{ content: req.body.content }]);
    }
    res.redirect('/admin');
});

// 5. Add Project
app.post('/admin/add-project', async (req, res) => {
    await supabase.from('projects').insert([{ 
        title: req.body.title, 
        description: req.body.description, 
        link: req.body.link 
    }]);
    res.redirect('/admin');
});

// Delete Achievement (Example)
app.post('/admin/delete-achievement/:id', async (req, res) => {
    await supabase.from('achievements').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

// Export for Vercel
module.exports = app;

// Listen (Local Only)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
}