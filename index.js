// File: index.js
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Connection (আপনার নিজের URL এবং Key এখানে বসান)
const supabaseUrl = 'https://murhgcvcmfwmubrtndhl.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmhnY3ZjbWZ3bXVicnRuZGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTMzNjEsImV4cCI6MjA5MDQ2OTM2MX0.0yuKev47bJbjN-4MlyO-rAO0hvIau7llKh6s-WKRW50';
const supabase = createClient(supabaseUrl, supabaseKey);

// EJS and Static Files Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- ROUTES ---

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
        res.send("Database connection error. Please check your Supabase credentials.");
    }
});

app.get('/admin', async (req, res) => {
    try {
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
    } catch (error) {
        res.send("Admin page error.");
    }
});

// Admin Post Routes
app.post('/admin/add-project', async (req, res) => {
    await supabase.from('projects').insert([{ title: req.body.title, description: req.body.description, link: req.body.link }]);
    res.redirect('/admin');
});

app.post('/admin/add-education', async (req, res) => {
    await supabase.from('education').insert([{ degree: req.body.degree, institution: req.body.institution, year: req.body.year, description: req.body.description }]);
    res.redirect('/admin');
});

app.post('/admin/add-achievement', async (req, res) => {
    await supabase.from('achievements').insert([{ title: req.body.title, year: req.body.year, description: req.body.description }]);
    res.redirect('/admin');
});

app.post('/admin/update-about', async (req, res) => {
    const { data: existing } = await supabase.from('about').select('id').limit(1).maybeSingle();
    if (existing) {
        await supabase.from('about').update({ content: req.body.content }).eq('id', existing.id);
    } else {
        await supabase.from('about').insert([{ content: req.body.content }]);
    }
    res.redirect('/admin');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});