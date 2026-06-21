import { API_URL } from './config.js';

// O Google Apps Script redireciona toda chamada de fetch para uma URL diferente.
// Por isso usamos 'no-cors' no POST e tratamos o GET via parâmetro action.

export async function listPatients() {
  const url = `${API_URL}?action=list`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error('Erro ao buscar pacientes');
  return response.json();
}

export async function savePatient(data) {
  const response = await fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response;
}
