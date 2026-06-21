const SHEET_NAME = "pacientes";
const HEADER = ["id", "createdAt", "updatedAt", "data_json"];

// ---------- Setup automático da planilha ----------
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  // Garante cabeçalho correto se a aba já existir vazia
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ---------- Helpers de leitura/escrita ----------
function readAllPatients_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const range = sheet.getRange(2, 1, lastRow - 1, HEADER.length);
  const rows = range.getValues();
  const patients = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = row[0];
    if (!id) continue;
    try {
      const parsed = JSON.parse(row[3]);
      patients.push(parsed);
    } catch (e) {
      // linha corrompida, ignora
    }
  }
  return patients;
}

function findRowById_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2; // +2 porque linha 1 é cabeçalho e índice começa em 0
  }
  return -1;
}

function upsertPatient_(patientObj) {
  const sheet = getSheet_();
  const id = patientObj.id;
  if (!id) throw new Error("Paciente sem id");

  const now = new Date().toISOString();
  if (!patientObj.createdAt) patientObj.createdAt = now;
  patientObj.updatedAt = now;

  const json = JSON.stringify(patientObj);
  const existingRow = findRowById_(sheet, id);

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, HEADER.length).setValues([[id, patientObj.createdAt, patientObj.updatedAt, json]]);
  } else {
    sheet.appendRow([id, patientObj.createdAt, patientObj.updatedAt, json]);
  }
  return patientObj;
}

function deletePatient_(id) {
  const sheet = getSheet_();
  const row = findRowById_(sheet, id);
  if (row > 0) {
    sheet.deleteRow(row);
    return true;
  }
  return false;
}

// ---------- Roteamento HTTP ----------
function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  try {
    const params = e.parameter || {};
    let body = {};
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    }

    const action = params.action || body.action;

    // Parâmetros podem vir via querystring (GET) com valores em JSON string,
    // ou via corpo do POST (compatibilidade retroativa).
    let patientParam = body.patient;
    if (!patientParam && params.patient) {
      try { patientParam = JSON.parse(params.patient); } catch (err) { patientParam = null; }
    }
    const idParam = body.id || params.id;

    let result;
    switch (action) {
      case "list":
        result = { ok: true, patients: readAllPatients_() };
        break;

      case "save":
        if (!patientParam) throw new Error("Campo 'patient' ausente");
        result = { ok: true, patient: upsertPatient_(patientParam) };
        break;

      case "delete":
        if (!idParam) throw new Error("Campo 'id' ausente");
        result = { ok: true, deleted: deletePatient_(idParam) };
        break;

      case "ping":
        result = { ok: true, message: "API do prontuário funcionando", timestamp: new Date().toISOString() };
        break;

      default:
        result = { ok: false, error: "Ação desconhecida: " + action };
    }

    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.message });
  }
}

function jsonResponse_(obj) {
  const output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Função opcional: rode esta função manualmente uma vez no editor do Apps Script
 * (selecione "testSetup" no menu de funções e clique em Executar) para criar a
 * aba da planilha antes mesmo de publicar o Web App. Não é obrigatório — a aba
 * é criada automaticamente na primeira chamada — mas ajuda a confirmar que tudo
 * está configurado corretamente.
 */
function testSetup() {
  const sheet = getSheet_();
  Logger.log("Planilha configurada: " + sheet.getName());
  Logger.log("Linhas existentes: " + sheet.getLastRow());
}
