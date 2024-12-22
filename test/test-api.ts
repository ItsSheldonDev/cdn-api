// test/test-api.ts
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData = require('form-data');

const API_URL = 'http://localhost:3000/api';
let adminToken: string;
let userToken: string;
let fileId: string;

// Fonction pour générer un email aléatoire
const generateRandomEmail = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test${timestamp}${random}@example.com`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testApi() {
  console.log('\n🚀 Démarrage des tests API...\n');

  try {
    // Test Auth Admin
    console.log('👤 Test Authentification Admin');
    console.log('📝 POST /auth/login');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123!'
    });
    adminToken = adminLogin.data.accessToken;
    console.log('✅ Admin connecté avec succès\n');

    // Test Settings
    console.log('⚙️ Test Paramètres');
    console.log('📝 GET /admin/settings');
    const settings = await axios.get(`${API_URL}/admin/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('📊 Paramètres actuels:', JSON.stringify(settings.data, null, 2));
    console.log('✅ Paramètres récupérés avec succès\n');

    // Test Création Utilisateur
    const testEmail = generateRandomEmail();
    console.log('👥 Test Création Utilisateur');
    console.log('📝 POST /auth/register');
    console.log('📧 Email de test:', testEmail);
    await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: 'test123!'
    });
    console.log('✅ Utilisateur créé avec succès\n');

    // Attente courte pour la base de données
    await sleep(1000);

    // Test Approbation Utilisateur
    console.log('👍 Test Approbation Utilisateur');
    console.log('📝 GET /admin/users');
    const users = await axios.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const testUser = users.data.find(u => u.email === testEmail);
    
    if (!testUser) {
      throw new Error('Utilisateur de test non trouvé !');
    }
    
    console.log(`📝 POST /admin/users/approve/${testUser.id}`);
    await axios.post(`${API_URL}/admin/users/approve/${testUser.id}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Utilisateur approuvé avec succès\n');

    // Test Login Utilisateur
    console.log('🔑 Test Login Utilisateur');
    console.log('📝 POST /auth/login');
    const userLogin = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: 'test123!'
    });
    userToken = userLogin.data.accessToken;
    console.log('✅ Utilisateur connecté avec succès\n');

    // Test Upload Fichier
    console.log('📤 Test Upload Fichier');
    const testFile = path.join(process.cwd(), 'test-file.txt');
    fs.writeFileSync(testFile, 'Ceci est un fichier de test pour l\'API');

    const form = new FormData();
    form.append('file', fs.createReadStream(testFile), {
      filename: 'test-file.txt',
      contentType: 'text/plain',
    });
    form.append('customName', 'mon-fichier-test.txt');

    console.log('📝 POST /files/upload');
    const upload = await axios.post(`${API_URL}/files/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${userToken}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    fileId = upload.data.shareCode;
    console.log('✅ Fichier uploadé avec succès\n');

    // Test Info Fichier
    console.log('📄 Test Info Fichier');
    console.log(`📝 GET /files/${fileId}/info`);
    const fileInfo = await axios.get(`${API_URL}/files/${fileId}/info`);
    console.log('📊 Informations du fichier:', JSON.stringify(fileInfo.data, null, 2));
    console.log('✅ Informations récupérées avec succès\n');

    // Test Quota Utilisateur
    console.log('💾 Test Quota Utilisateur');
    console.log('📝 GET /files/quota');
    const quota = await axios.get(`${API_URL}/files/quota`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('📊 Quota utilisateur:', JSON.stringify(quota.data, null, 2));
    console.log('✅ Quota récupéré avec succès\n');

    // Test Stats Admin
    console.log('📊 Test Statistiques Admin');
    console.log('📝 GET /admin/stats');
    const stats = await axios.get(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('📈 Statistiques:', JSON.stringify(stats.data, null, 2));
    console.log('✅ Statistiques récupérées avec succès\n');

    // Nettoyage
    console.log('🧹 Nettoyage');
    console.log(`📝 DELETE /files/${fileId}`);
    await axios.delete(`${API_URL}/files/${fileId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    fs.unlinkSync(testFile);
    console.log('✅ Nettoyage effectué avec succès\n');

    console.log('🎉 Tous les tests ont réussi !\n');

  } catch (error) {
    console.error('\n❌ Erreur durant les tests:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

testApi();