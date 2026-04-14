// FinanzaPro CLI - Interactive Logic
const CATEGORIES = {
  income: ['Salario', 'Freelance', 'Inversiones', 'Regalo', 'Otros'],
  expense: ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Otros']
};

let transactions = [];
const output = document.getElementById('output');
const input = document.getElementById('commandInput');
const terminal = document.getElementById('terminal');
const autocompleteBox = document.getElementById('autocomplete-box');

const COMMANDS = ['help', 'ls', 'stats', 'ingreso', 'gasto', 'gestionar', 'export', 'clear', 'print', 'ls export', 'stats export'];

// Initialize
async function init() {
  await fetchTransactions();
  input.addEventListener('keydown', handleInput);
  input.addEventListener('input', handleAutocomplete);
  input.focus();
  
  // Mostrar el menú al abrir la aplicación
  printHelp();
}

async function fetchTransactions() {
  try {
    const res = await fetch('/api/transactions');
    transactions = await res.json();
  } catch (e) {
    transactions = JSON.parse(localStorage.getItem('finanzapro_data') || '[]');
  }
}

async function saveTransactions() {
  try {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactions)
    });
  } catch (e) {}
  localStorage.setItem('finanzapro_data', JSON.stringify(transactions));
}

function print(text, className = '') {
  const line = document.createElement('div');
  line.className = 'output-line ' + className;
  line.innerHTML = text;
  output.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function clearScreen() {
  output.innerHTML = '';
  document.getElementById('chartsContainer').style.display = 'none';
}

function printNavigationFooter() {
  print('<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; display: flex; justify-content: space-between;">' +
    '<span>[help] Menú Principal</span>' +
    '<span>[clear] Limpiar Pantalla</span>' +
    '<span>SESIÓN ACTIVA: ' + new Date().toLocaleTimeString() + '</span>' +
    '</div>');
}

let selectedSuggestionIndex = -1;

function handleInput(e) {
  const suggestions = getSuggestions(input.value);

  if (e.key === 'ArrowDown' && suggestions.length > 0) {
    e.preventDefault();
    selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestions.length;
    renderSuggestions(suggestions);
    return;
  }
  if (e.key === 'ArrowUp' && suggestions.length > 0) {
    e.preventDefault();
    selectedSuggestionIndex = (selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length;
    renderSuggestions(suggestions);
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    if (suggestions.length > 0) {
      const index = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
      applySuggestion(suggestions[index]);
    }
    return;
  }
  if (e.key === 'Enter') {
    if (autocompleteBox.style.display === 'block' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      applySuggestion(suggestions[selectedSuggestionIndex]);
      return;
    }
    const cmd = input.value.trim();
    autocompleteBox.style.display = 'none';
    if (cmd) {
      print(`<span class="prompt-text">finanzapro@localhost:~$</span> <span style="color: #9ece6a">${cmd}</span>`);
      executeCommand(cmd);
    }
    input.value = '';
    selectedSuggestionIndex = -1;
  }
}

function handleAutocomplete() {
  const val = input.value.trim().toLowerCase();
  
  // Autocomplete para categorías en el formulario
  if (currentContext && currentContext.type === 'form' && currentContext.step === 2) {
    const cats = CATEGORIES[currentContext.formType];
    const suggestions = cats.filter(c => c.toLowerCase().startsWith(val));
    if (suggestions.length > 0) {
      renderSuggestions(suggestions);
      autocompleteBox.style.display = 'block';
    } else {
      autocompleteBox.style.display = 'none';
    }
    return;
  }

  if (!val || currentContext) {
    autocompleteBox.style.display = 'none';
    selectedSuggestionIndex = -1;
    return;
  }

  const suggestions = getSuggestions(val);
  if (suggestions.length > 0) {
    renderSuggestions(suggestions);
    autocompleteBox.style.display = 'block';
  } else {
    autocompleteBox.style.display = 'none';
    selectedSuggestionIndex = -1;
  }
}

function renderSuggestions(suggestions) {
  autocompleteBox.innerHTML = suggestions.map((s, idx) => 
    `<div class="suggestion-item ${idx === selectedSuggestionIndex ? 'active' : ''}" onclick="applySuggestion('${s}')">${s}</div>`
  ).join('');
}

function getSuggestions(val) {
  return COMMANDS.filter(c => c.startsWith(val.toLowerCase()));
}

function applySuggestion(s) {
  input.value = s;
  autocompleteBox.style.display = 'none';
  input.focus();
}

let currentContext = null;

async function executeCommand(fullCmd) {
  if (currentContext && currentContext.type === 'form') {
    handleFormInput(fullCmd);
    return;
  }
  
  if (currentContext && currentContext.type === 'manage') {
    handleManagementInput(fullCmd);
    return;
  }

  const [cmd, ...args] = fullCmd.split(' ');
  const command = cmd.toLowerCase();

  // Comandos que disparan "navegación" (limpian pantalla)
  const navigationCommands = ['help', 'ls', 'list', 'stats', 'export', 'ingreso', 'gasto'];
  
  if (navigationCommands.includes(command)) {
    clearScreen();
  }
  
  switch (command) {
    case 'help':
      printHelp();
      break;
    case 'ls':
    case 'list':
      if (args[0] === 'export') {
        exportLS();
      } else {
        listTransactions(parseInt(args[0]) || 1);
      }
      break;
    case 'ingreso':
    case 'gasto':
      startFormWizard(command === 'ingreso' ? 'income' : 'expense');
      break;
    case 'gestionar':
      listTransactionsForManagement();
      break;
    case 'edit':
      startFormWizard(null, args[0]);
      break;
    case 'rm':
    case 'delete':
      await deleteTransaction(args[0]);
      break;
    case 'stats':
      if (args[0] === 'export') {
        exportStats();
      } else {
        showStats(parseInt(args[0]) || 1);
      }
      break;
    case 'clear':
      clearScreen();
      break;
    case 'export':
      exportPDF();
      break;
    case 'print':
      window.print();
      break;
    default:
      print(`Comando no reconocido: ${cmd}. Escribe 'help' para ayuda.`, 'expense');
  }

  if (navigationCommands.includes(command) && !currentContext) {
    printNavigationFooter();
  }
}

function startFormWizard(type, editId = null) {
  let initialData = { type: type, date: new Date().toISOString().split('T')[0] };
  let formType = type;

  if (editId) {
    const t = transactions.find(x => x.id.endsWith(editId));
    if (!t) {
      print('Error: Transacción no encontrada.', 'expense');
      return;
    }
    initialData = { ...t };
    formType = t.type;
  }

  currentContext = {
    type: 'form',
    formType: formType,
    step: 0,
    editId: editId ? initialData.id : null,
    data: initialData
  };
  renderForm();
}

function renderForm() {
  clearScreen();
  const typeLabel = currentContext.formType === 'income' ? 'DEPÓSITO (CRÉDITO)' : 'RETIRO (DÉBITO)';
  const accentColor = currentContext.formType === 'income' ? 'var(--green)' : 'var(--red)';
  
  print(`<div style="border-left: 4px solid ${accentColor}; padding-left: 15px; margin-bottom: 20px;">` +
    `<div style="color: ${accentColor}; font-weight: bold; font-size: 18px;">FORMULARIO DE OPERACIÓN BANCARIA</div>` +
    `<div style="color: var(--muted); font-size: 12px;">TIPO: ${typeLabel} | FECHA: ${currentContext.data.date}</div>` +
    `</div>`);

  const steps = [
    { label: 'MONTO_VALOR', key: 'amount', placeholder: 'Ej: 1500.00' },
    { label: 'DESCRIPCIÓN', key: 'description', placeholder: 'Ej: Pago de servicios' },
    { label: 'CATEGORÍA', key: 'category', placeholder: 'Seleccione de la lista' }
  ];

  let formHtml = '<div class="bank-table" style="margin-bottom: 25px;">';
  steps.forEach((s, idx) => {
    const isCurrent = currentContext.step === idx;
    const value = currentContext.data[s.key] || (isCurrent ? '<span style="color: var(--yellow); animation: blink 1s infinite;">_</span>' : '<span style="color: var(--muted)">[ PENDIENTE ]</span>');
    const marker = isCurrent ? `<span style="color: var(--yellow)">[>]</span>` : (currentContext.data[s.key] ? `<span style="color: var(--green)">[x]</span>` : `[ ]`);
    
    formHtml += `
      <div style="display: grid; grid-template-columns: 40px 150px 1fr; padding: 12px; border-bottom: 1px solid var(--border); ${isCurrent ? 'background: rgba(224, 175, 104, 0.05);' : ''}">
        <span>${marker}</span>
        <span style="color: var(--yellow); font-weight: bold;">${s.label}:</span>
        <span style="color: #fff;">${value}</span>
      </div>
    `;
  });
  formHtml += '</div>';
  print(formHtml);

  if (currentContext.step === 2) {
    print('<div style="color: var(--yellow); font-weight: bold; margin-bottom: 10px;">SELECCIONE CATEGORÍA (Escriba el nombre):</div>');
    const cats = CATEGORIES[currentContext.formType];
    let catGrid = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">';
    cats.forEach(c => {
      catGrid += `<div style="color: var(--text); font-size: 13px;">[ ] ${c}</div>`;
    });
    catGrid += '</div>';
    print(catGrid);
  }

  print(`<div style="color: var(--muted); font-size: 12px;">INSTRUCCIÓN: Ingrese el valor para <span style="color: var(--yellow)">${steps[currentContext.step].label}</span> y presione ENTER.</div>`);
  print(`<div style="margin-top: 10px; color: var(--red); font-size: 11px; font-weight: bold;">[!] Escriba 'menu' para cancelar y volver al inicio.</div>`);
}

async function handleFormInput(val) {
  const inputVal = val.trim().toLowerCase();
  if (inputVal === 'menu' || inputVal === 'cancel' || inputVal === 'volver') {
    currentContext = null;
    clearScreen();
    print('Operación cancelada. Volviendo al menú principal...', 'expense');
    printHelp();
    printNavigationFooter();
    return;
  }

  const steps = ['amount', 'description', 'category'];
  const currentKey = steps[currentContext.step];

  if (currentContext.step === 0) {
    const amount = parseFloat(inputVal);
    if (isNaN(amount) || amount <= 0) {
      print('Error: El monto debe ser un número positivo.', 'expense');
      return;
    }
    currentContext.data.amount = amount;
  } else if (currentContext.step === 1) {
    if (inputVal.length < 3) {
      print('Error: La descripción es demasiado corta.', 'expense');
      return;
    }
    currentContext.data.description = inputVal;
  } else if (currentContext.step === 2) {
    const cats = CATEGORIES[currentContext.formType];
    const found = cats.find(c => c.toLowerCase() === inputVal.toLowerCase());
    if (!found) {
      print('Error: Categoría no válida. Seleccione una de la lista.', 'expense');
      return;
    }
    currentContext.data.category = found;
  }

  currentContext.step++;

  if (currentContext.step < 3) {
    renderForm();
  } else {
    // Finalizar
    if (currentContext.editId) {
      const idx = transactions.findIndex(t => t.id === currentContext.editId);
      if (idx !== -1) transactions[idx] = { ...currentContext.data };
    } else {
      const newT = { 
        id: Date.now().toString(), 
        ...currentContext.data 
      };
      transactions.push(newT);
    }
    
    await saveTransactions();
    currentContext = null;
    clearScreen();
    print('<div class="header-block" style="border-color: var(--green)">OPERACIÓN EXITOSA</div>');
    print(`Se ha procesado la transacción correctamente.`, 'income');
    printNavigationFooter();
  }
}

function listTransactionsForManagement() {
  clearScreen();
  currentContext = { type: 'manage', step: 'select', list: [] };
  
  print('<div class="header-block">CENTRO DE GESTIÓN DE MOVIMIENTOS</div>');
  print('<div style="color: var(--muted); margin-bottom: 15px;">Seleccione el número de transacción para operar o escriba <span style="color: var(--red)">menu</span> para salir.</div>');
  
  if (transactions.length === 0) {
    print('No hay transacciones para gestionar.');
    currentContext = null;
    printNavigationFooter();
    return;
  }

  // Ordenar y guardar en el contexto para referencia por índice
  currentContext.list = [...transactions].sort((a,b) => b.id.localeCompare(a.id));

  let tableHtml = '<table class="bank-table"><thead><tr><th>#</th><th>FECHA</th><th>TIPO</th><th>CATEGORÍA</th><th>DESCRIPCIÓN</th><th style="text-align: right">MONTO</th></tr></thead><tbody>';
  currentContext.list.forEach((t, idx) => {
    tableHtml += `<tr>
      <td style="color: var(--yellow); font-weight: bold;">[${idx + 1}]</td>
      <td>${t.date}</td>
      <td>${t.type === 'income' ? 'INC' : 'EXP'}</td>
      <td>${t.category}</td>
      <td>${t.description}</td>
      <td style="text-align: right">$${t.amount.toFixed(2)}</td>
    </tr>`;
  });
  tableHtml += '</tbody></table>';
  print(tableHtml);
  print('<div style="color: var(--yellow); font-weight: bold;">INGRESE EL NÚMERO [1-' + currentContext.list.length + ']:</div>');
}

async function handleManagementInput(val) {
  const inputVal = val.trim().toLowerCase();
  
  if (inputVal === 'menu' || inputVal === 'volver') {
    currentContext = null;
    clearScreen();
    printHelp();
    printNavigationFooter();
    return;
  }

  if (currentContext.step === 'select') {
    const idx = parseInt(inputVal) - 1;
    if (isNaN(idx) || idx < 0 || idx >= currentContext.list.length) {
      print('Error: Selección inválida. Ingrese un número de la lista.', 'expense');
      return;
    }
    
    currentContext.selectedTransaction = currentContext.list[idx];
    currentContext.step = 'action';
    
    clearScreen();
    print('<div class="header-block">OPERACIÓN SOBRE TRANSACCIÓN #' + (idx + 1) + '</div>');
    print('<div class="summary-card" style="grid-template-columns: 1fr;">' +
      '<div class="summary-item">' +
        '<div class="label">Detalle Seleccionado</div>' +
        '<div class="value">' + currentContext.selectedTransaction.description + ' | $' + currentContext.selectedTransaction.amount.toFixed(2) + '</div>' +
      '</div></div>');
    
    print('<div style="margin: 20px 0;">');
    print('<div style="color: var(--yellow); font-weight: bold; margin-bottom: 10px;">¿QUÉ ACCIÓN DESEA REALIZAR?</div>');
    print('<div style="color: var(--green); margin-bottom: 5px;">[E] EDITAR - Modificar los datos de este registro</div>');
    print('<div style="color: var(--red); margin-bottom: 5px;">[D] ELIMINAR - Borrar permanentemente este registro</div>');
    print('<div style="color: var(--muted);">[C] CANCELAR - Volver a la lista</div>');
    print('</div>');
  } 
  else if (currentContext.step === 'action') {
    if (inputVal === 'e') {
      const id = currentContext.selectedTransaction.id;
      currentContext = null;
      startFormWizard(null, id);
    } else if (inputVal === 'd') {
      const id = currentContext.selectedTransaction.id;
      await deleteTransaction(id);
      currentContext = null;
      listTransactionsForManagement(); // Volver a la lista
    } else if (inputVal === 'c') {
      listTransactionsForManagement();
    } else {
      print('Error: Opción no válida. Use E, D o C.', 'expense');
    }
  }
}

function printHelp() {
  print('<div style="border: 2px solid var(--blue); padding: 15px; text-align: center; margin-bottom: 20px;">' +
    '<div style="color: var(--blue); font-weight: 900; font-size: 20px; letter-spacing: 2px;">FINANZAPRO - SISTEMA BANCARIO</div>' +
    '<div style="color: var(--muted); font-size: 10px; margin-top: 5px;">TERMINAL DE OPERACIONES FINANCIERAS v3.0</div>' +
    '</div>');

  const menuItems = [
    { cat: 'CONSULTAS', cmd: 'ls', desc: 'Estado de cuenta detallado (Paginado)' },
    { cat: 'CONSULTAS', cmd: 'stats', desc: 'Balance consolidado y análisis visual' },
    { cat: 'OPERACIONES', cmd: 'ingreso', desc: 'Iniciar proceso de depósito (Crédito)' },
    { cat: 'OPERACIONES', cmd: 'gasto', desc: 'Iniciar proceso de retiro (Débito)' },
    { cat: 'OPERACIONES', cmd: 'gestionar', desc: 'Modificar o anular transacciones' }
  ];

  let currentCat = '';
  menuItems.forEach(item => {
    if (item.cat !== currentCat) {
      currentCat = item.cat;
      print(`<div style="color: var(--yellow); font-weight: bold; margin-top: 15px; border-bottom: 1px solid var(--muted); padding-bottom: 2px;">[MODULO: ${currentCat}]</div>`);
    }
    print(`<div style="display: flex; padding: 4px 0;">` +
      `<span style="color: var(--green); width: 100px; font-weight: bold;">> ${item.cmd}</span>` +
      `<span style="color: var(--text); flex: 1;">${item.desc}</span>` +
      `</div>`);
  });

  print('<div style="margin-top: 25px; padding: 15px; border: 1px dashed var(--muted); border-radius: 4px;">');
  print('<div style="color: var(--yellow); font-weight: bold; margin-bottom: 8px;">GUÍA DE OPERACIÓN:</div>');
  print('<div style="color: var(--text); font-size: 13px;">Escriba <span style="color: var(--green)">ingreso</span> o <span style="color: var(--red)">gasto</span> para iniciar el asistente.</div>');
  print('<div style="color: var(--muted); font-size: 11px; margin-top: 5px;">Use <span style="color: var(--blue)">ls export</span> o <span style="color: var(--blue)">stats export</span> para generar reportes PDF.</div>');
  print('</div>');
  
  print('<div style="color: var(--muted); font-size: 11px; margin-top: 15px; text-align: center;">--- FIN DEL DIRECTORIO ---</div>');
}

function listTransactions(page = 1) {
  if (transactions.length === 0) {
    print('No hay transacciones registradas.');
    return;
  }
  
  print('<div class="header-block">ESTADO DE CUENTA DETALLADO</div>');
  
  const itemsPerPage = 15;
  const sortedTransactions = [...transactions].sort((a, b) => b.id.localeCompare(a.id));
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = sortedTransactions.slice(start, end);

  let tableHtml = `
    <table class="bank-table">
      <thead>
        <tr>
          <th>ID_REF</th>
          <th>FECHA</th>
          <th>TIPO</th>
          <th>CATEGORÍA</th>
          <th>DESCRIPCIÓN</th>
          <th style="text-align: right">MONTO_NETO</th>
        </tr>
      </thead>
      <tbody>
  `;

  pageItems.forEach(t => {
    const typeClass = t.type === 'income' ? 'bg-income' : 'bg-expense';
    const typeText = t.type === 'income' ? 'INC' : 'EXP';
    const amountClass = t.type === 'income' ? 'income' : 'expense';
    const id = t.id.slice(-8);
    
    tableHtml += `
      <tr>
        <td style="color: var(--muted)">#${id}</td>
        <td>${t.date}</td>
        <td><span class="status-box ${typeClass}">${typeText}</span></td>
        <td>${t.category}</td>
        <td>${t.description}</td>
        <td style="text-align: right" class="${amountClass}">$${t.amount.toFixed(2)}</td>
      </tr>
    `;
  });

  tableHtml += '</tbody></table>';
  print(tableHtml);

  if (totalPages > 1) {
    print(`<div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px; color: var(--yellow); font-weight: bold;">` +
      (currentPage > 1 ? `<span style="cursor: pointer;" onclick="executeCommand('ls ${currentPage - 1}')"><< ANTERIOR</span>` : `<span style="opacity: 0.3;"><< ANTERIOR</span>`) +
      `<span>PÁGINA ${currentPage} DE ${totalPages}</span>` +
      (currentPage < totalPages ? `<span style="cursor: pointer;" onclick="executeCommand('ls ${currentPage + 1}')">SIGUIENTE >></span>` : `<span style="opacity: 0.3;">SIGUIENTE >></span>`) +
      `</div>`);
  }
}

async function addTransaction(args) {
  // Simple parser: add [type] [amount] [desc] [cat] [date]
  if (args.length < 3) {
    print('Error: Faltan argumentos. Uso: add [income/expense] [monto] [desc] [cat?] [fecha?]', 'expense');
    return;
  }

  const type = args[0].toLowerCase() === 'income' ? 'income' : 'expense';
  const amount = parseFloat(args[1]);
  const description = args[2].replace(/"/g, '');
  const category = args[3] || (type === 'income' ? 'Otros' : 'Otros');
  const date = args[4] || new Date().toISOString().split('T')[0];

  if (isNaN(amount)) {
    print('Error: Monto inválido.', 'expense');
    return;
  }

  const newT = { id: Date.now().toString(), type, amount, description, category, date };
  transactions.push(newT);
  await saveTransactions();
  print(`Transacción añadida con éxito. ID: ${newT.id.slice(-8)}`, 'income');
}

async function deleteTransaction(idSuffix) {
  if (!idSuffix) {
    print('Error: Debes proporcionar el ID (o los últimos 8 dígitos).', 'expense');
    return;
  }
  const initialCount = transactions.length;
  transactions = transactions.filter(t => !t.id.endsWith(idSuffix));
  
  if (transactions.length < initialCount) {
    await saveTransactions();
    print('Transacción eliminada.', 'income');
  } else {
    print('Error: No se encontró ninguna transacción con ese ID.', 'expense');
  }
}

function showStats(page = 1) {
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  // 1. Graficas responsivas al principio
  const chartsContainer = document.getElementById('chartsContainer');
  chartsContainer.style.display = 'block';
  updateCharts();

  print('<div class="header-block">RESUMEN DE POSICIÓN BANCARIA</div>');
  
  // 2. Cuadro con balance, ingreso, gasto
  const summaryHtml = `
    <div class="summary-card">
      <div class="summary-item">
        <div class="label">Balance Neto</div>
        <div class="value ${balance >= 0 ? 'income' : 'expense'}">$${balance.toLocaleString()}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Ingresos</div>
        <div class="value income">+$${totals.income.toLocaleString()}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Gastos</div>
        <div class="value expense">-$${totals.expense.toLocaleString()}</div>
      </div>
    </div>
  `;
  print(summaryHtml);

  // 3. Desglose detallado con paginación (max 15)
  print('<div class="header-block">AUDITORÍA DETALLADA DE MOVIMIENTOS</div>');
  
  if (transactions.length === 0) {
    print('<div class="output-line" style="color: var(--muted)">No se registran movimientos.</div>');
    return;
  }

  const itemsPerPage = 15;
  const sortedTransactions = [...transactions].sort((a, b) => b.id.localeCompare(a.id));
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = sortedTransactions.slice(start, end);

  let detailHtml = `
    <table class="bank-table">
      <thead>
        <tr>
          <th>FECHA_REGISTRO</th>
          <th>TIPO</th>
          <th>CATEGORÍA</th>
          <th>DESCRIPCIÓN</th>
          <th style="text-align: right">MONTO</th>
        </tr>
      </thead>
      <tbody>
  `;

  pageItems.forEach(t => {
    const typeClass = t.type === 'income' ? 'bg-income' : 'bg-expense';
    const typeText = t.type === 'income' ? 'INC' : 'EXP';
    const amountClass = t.type === 'income' ? 'income' : 'expense';
    const regDate = new Date(parseInt(t.id)).toLocaleDateString();

    detailHtml += `
      <tr>
        <td style="color: var(--muted); font-size: 11px;">${regDate}</td>
        <td><span class="status-box ${typeClass}">${typeText}</span></td>
        <td>${t.category}</td>
        <td>${t.description}</td>
        <td style="text-align: right" class="${amountClass}">$${t.amount.toFixed(2)}</td>
      </tr>
    `;
  });

  detailHtml += '</tbody></table>';
  print(detailHtml);
  
  // Controles de paginación
  if (totalPages > 1) {
    print(`<div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px; color: var(--yellow); font-weight: bold;">` +
      (currentPage > 1 ? `<span style="cursor: pointer;" onclick="executeCommand('stats ${currentPage - 1}')"><< ANTERIOR</span>` : `<span style="opacity: 0.3;"><< ANTERIOR</span>`) +
      `<span>PÁGINA ${currentPage} DE ${totalPages}</span>` +
      (currentPage < totalPages ? `<span style="cursor: pointer;" onclick="executeCommand('stats ${currentPage + 1}')">SIGUIENTE >></span>` : `<span style="opacity: 0.3;">SIGUIENTE >></span>`) +
      `</div>`);
    print(`<div style="text-align: center; font-size: 10px; color: var(--muted); margin-top: 5px;">Use 'stats [página]' para navegar directamente.</div>`);
  }
  
  print(`<div class="output-line" style="color: var(--muted); font-size: 11px; text-align: right; margin-top: 10px;">
    REPORTE GENERADO: ${new Date().toLocaleString()} | TOTAL: ${transactions.length}
  </div>`);
}

let mainChart = null;
let categoryChart = null;

function updateCharts() {
  const ctxMain = document.getElementById('mainChart');
  const ctxCat = document.getElementById('categoryChart');

  if (mainChart) mainChart.destroy();
  if (categoryChart) categoryChart.destroy();

  // Data for main chart (Income vs Expense)
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  mainChart = new Chart(ctxMain, {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        data: [totals.income, totals.expense],
        backgroundColor: ['#73daca', '#f7768e']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 200,
      plugins: { 
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        y: { grid: { color: '#292e42' }, ticks: { color: '#a9b1d6' } },
        x: { ticks: { color: '#a9b1d6' } }
      }
    }
  });

  // Data for category chart
  const catData = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  categoryChart = new Chart(ctxCat, {
    type: 'doughnut',
    data: {
      labels: Object.keys(catData),
      datasets: [{
        data: Object.values(catData),
        backgroundColor: ['#7aa2f7', '#bb9af7', '#e0af68', '#9ece6a', '#f7768e', '#73daca']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 200,
      plugins: { 
        legend: { 
          position: window.innerWidth < 600 ? 'bottom' : 'right', 
          labels: { color: '#a9b1d6', font: { size: 10 } } 
        } 
      }
    }
  });
}

function exportLS() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');
  doc.setFontSize(16);
  doc.text('ESTADO DE CUENTA DETALLADO', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('courier', 'normal');
  doc.text(`FECHA: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });
  
  const body = [...transactions].sort((a, b) => b.id.localeCompare(a.id)).map(t => [
    t.id.slice(-8),
    t.date,
    t.type.toUpperCase(),
    t.category,
    t.description,
    `$${t.amount.toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 35,
    head: [['ID', 'FECHA', 'TIPO', 'CATEGORIA', 'DESCRIPCION', 'MONTO']],
    body: body,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    styles: { font: 'courier', fontSize: 8 }
  });
  doc.save('finanzapro_ls.pdf');
  print('Exportación de Estado de Cuenta completada.', 'income');
}

function exportStats() {
  exportPDF(); // El exportPDF actual ya hace el reporte completo tipo stats
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Configuración de fuente y color para impresora (Blanco y Negro)
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.text('FINANZAPRO - REPORTE DE AUDITORÍA INTEGRAL', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('courier', 'normal');
  doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });
  doc.line(14, 32, 196, 32);

  // 1. Resumen de Posición
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });
  const balance = totals.income - totals.expense;

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text('1. RESUMEN DE POSICIÓN BANCARIA', 14, 42);
  
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.text(`BALANCE NETO:   $${balance.toFixed(2)}`, 20, 50);
  doc.text(`TOTAL INGRESOS: $${totals.income.toFixed(2)}`, 20, 56);
  doc.text(`TOTAL GASTOS:   $${totals.expense.toFixed(2)}`, 20, 62);

  // 2. Tabla de Movimientos
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text('2. DESGLOSE DETALLADO DE MOVIMIENTOS', 14, 75);

  const body = [...transactions].sort((a, b) => b.id.localeCompare(a.id)).map(t => [
    new Date(parseInt(t.id)).toLocaleDateString(),
    t.type === 'income' ? 'INC' : 'EXP',
    t.category,
    t.description,
    `$${t.amount.toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 80,
    head: [['REGISTRO', 'TIPO', 'CATEGORIA', 'DESCRIPCION', 'MONTO']],
    body: body,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], font: 'courier' },
    styles: { font: 'courier', fontSize: 8 },
    columnStyles: { 4: { halign: 'right' } }
  });

  doc.save('finanzapro_auditoria_completa.pdf');
  print('Reporte Integral PDF generado con éxito.', 'income');
}

init();
