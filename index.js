// File: index.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const osUtils = require('os-utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Connection (আপনার কপি করা তথ্য এখানে দিন)
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let visitorCount = 0;

// Routes
app.get('/', async (req, res) => {
    visitorCount++;
    const { data: projects } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: education } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: achievements } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: about } = await supabase.from('about').select('*').limit(1).single();

    res.render('index', { 
        projects: projects || [],
        education: education || [],
        achievements: achievements || [],
        aboutMe: about ? about.content : "Welcome to my portfolio!"
    });
});

app.get('/admin', async (req, res) => {
    const { data: projects } = await supabase.from('projects').select('*').order('id', { ascending: false });
    const { data: education } = await supabase.from('education').select('*').order('id', { ascending: false });
    const { data: achievements } = await supabase.from('achievements').select('*').order('id', { ascending: false });
    const { data: about } = await supabase.from('about').select('*').limit(1).single();

    res.render('admin', {
        projects: projects || [],
        education: education || [],
        achievements: achievements || [],
        aboutMe: about ? about.content : ""
    });
});

// Stats API
app.get('/api/stats', (req, res) => {
    osUtils.cpuUsage((cpuPercent) => {
        res.json({
            cpu: (cpuPercent * 100).toFixed(1),
            ramUsed: ( (os.totalmem() - os.freemem()) / (1024**3) ).toFixed(2),
            ramTotal: (os.totalmem() / (1024**3)).toFixed(2),
            sysLoad: os.loadavg()[0].toFixed(2),
            visitors: visitorCount
        });
    });
});

// Add Actions
app.post('/admin/add-project', async (req, res) => {
    await supabase.from('projects').insert([req.body]);
    res.redirect('/admin');
});

app.post('/admin/update-about', async (req, res) => {
    const { data } = await supabase.from('about').select('id').limit(1).single();
    if (data) await supabase.from('about').update({ content: req.body.content }).eq('id', data.id);
    else await supabase.from('about').insert([{ content: req.body.content }]);
    res.redirect('/admin');
});

// Delete Actions (Example for project)
app.post('/admin/delete-project/:id', async (req, res) => {
    await supabase.from('projects').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));