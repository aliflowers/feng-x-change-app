
// Script para simular creación y consulta de sesión para inspeccionar estructura completa
// Ejecutar con: node scripts/inspect-didit-structure.js

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_API_URL = 'https://verification.didit.me/v3';
// Usar un workflow ID real si es posible, o uno de prueba si la API lo permite sin uno específico
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID || 'dummy-workflow-id';

async function inspectStructure() {
 if (!DIDIT_API_KEY) {
  console.error('Falta DIDIT_API_KEY en variables de entorno.');
  return;
 }

 console.log('--- Iniciando Inspección de Estructura Didit ---');

 // 1. Intentar crear una sesión (si falla por workflow ID incorrecto, al menos veremos el error o estructura de error)
 // Si no tenemos un workflow ID válido a mano, intentaremos consultar una sesión inexistente para ver si el error revela estructura, 
 // o mejor, usaremos el endpoint de "List Sessions" si existe para tomar una real antigua.

 try {
  // Opción A: Listar sesiones recientes (si la API lo permite)
  console.log('Intentando listar sesiones recientes...');
  const listResponse = await fetch(`${DIDIT_API_URL}/sessions?limit=1`, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
    'Content-Type': 'application/json'
   }
  });

  if (listResponse.ok) {
   const data = await listResponse.json();
   if (data.items && data.items.length > 0) {
    const sessionId = data.items[0].session_id;
    console.log(`Sesión encontrada en lista: ${sessionId}`);

    // Consultar detalles de esa sesión real
    const detailResponse = await fetch(`${DIDIT_API_URL}/session/${sessionId}/decision`, {
     headers: { 'x-api-key': DIDIT_API_KEY }
    });
    const detailData = await detailResponse.json();
    console.log('--- DETALLES DE DECISIÓN (REAL) ---');
    console.dir(detailData, { depth: null });
    return;
   } else {
    console.log('Listado exitoso pero sin sesiones.');
   }
  } else {
   console.log('Endpoint de listado no disponible o falló:', listResponse.status);
  }

 } catch (err) {
  console.error('Error en inspección:', err);
 }
}

inspectStructure();
