// FinanzaPro - Vanilla JS Logic
const CATEGORIES = {
  income: ['Salario', 'Freelance', 'Inversiones', 'Regalo', 'Otros'],
  expense: ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Otros']
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

let transactions = JSON.parse(localStorage.getItem('finanzapro_data') || '[]');
let mainChart: any = null;
let categoryChart: any = null;

// DOM Elements
const transactionForm = document.getElementById('transactionForm') as HTMLFormElement;
const filterMonthInput = document.getElementById('filterMonth') as HTMLInputElement;
const transactionTableBody = document.getElementById('transactionTableBody') as HTMLElement;
const categorySelect = document.getElementById('category') as HTMLSelectElement;
const typeInputs = document.getElementsByName('type');
const statBalance = document.getElementById('statBalance') as HTMLElement;
const statIncome = document.getElementById('statIncome') as HTMLElement;
const statExpense = document.getElementById('statExpense') as HTMLElement;
const transactionCount = document.getElementById('transactionCount') as HTMLElement;
const btnExportPDF = document.getElementById('btnExportPDF') as HTMLButtonElement;

// Initialize
function init() {
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7);
  if (filterMonthInput) filterMonthInput.value = monthStr;
  const dateInput = document.getElementById('date') as HTMLInputElement;
  if (dateInput) dateInput.value = now.toISOString().slice(0, 10);
  
  updateCategoryOptions();
  render();
}

function updateCategoryOptions() {
  const typeInput = Array.from(typeInputs).find(r => (r as HTMLInputElement).checked) as HTMLInputElement;
  const type = typeInput ? typeInput.value : 'expense';
  if (categorySelect) {
    categorySelect.innerHTML = CATEGORIES[type as keyof typeof CATEGORIES].map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

function render() {
  const filterMonth = filterMonthInput ? filterMonthInput.value : '';
  const filtered = transactions.filter((t: any) => t.date.startsWith(filterMonth))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Stats
  const totals = filtered.reduce((acc: any, t: any) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  if (statBalance) {
    statBalance.textContent = `$${balance.toLocaleString()}`;
    statBalance.className = `fw-bold mb-0 ${balance >= 0 ? 'text-dark' : 'text-danger'}`;
  }
  if (statIncome) statIncome.textContent = `+$${totals.income.toLocaleString()}`;
  if (statExpense) statExpense.textContent = `-$${totals.expense.toLocaleString()}`;
  if (transactionCount) transactionCount.textContent = `${filtered.length} Movimientos`;

  // Table
  if (transactionTableBody) {
    transactionTableBody.innerHTML = filtered.map((t: any) => `
      <tr class="hover-bg">
        <td class="ps-4 small text-muted">${new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
        <td><span class="fw-semibold">${t.description}</span></td>
        <td><span class="badge bg-light text-dark border">${t.category}</span></td>
        <td class="text-end fw-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}">
          ${t.type === 'income' ? '+' : '-'}$${t.amount.toLocaleString()}
        </td>
        <td class="text-end pe-4 no-print">
          <button class="btn btn-link text-danger p-0" onclick="deleteTransaction('${t.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  updateCharts(filtered);
}

function updateCharts(filtered: any[]) {
  // Main Chart
  const dailyData: Record<string, { income: number, expense: number }> = {};
  filtered.forEach(t => {
    const day = t.date.slice(8, 10);
    if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
    dailyData[day][t.type as 'income' | 'expense'] += t.amount;
  });

  const labels = Object.keys(dailyData).sort();
  const incomeData = labels.map(l => dailyData[l].income);
  const expenseData = labels.map(l => dailyData[l].expense);

  const mainChartEl = document.getElementById('mainChart') as HTMLCanvasElement;
  if (mainChartEl) {
    if (mainChart) mainChart.destroy();
    const ctxMain = mainChartEl.getContext('2d');
    if (ctxMain) {
      // @ts-ignore
      mainChart = new Chart(ctxMain, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Ingresos', data: incomeData, backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Gastos', data: expenseData, backgroundColor: '#ef4444', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { display: false }, ticks: { callback: (v: any) => '$' + v } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }

  // Category Chart
  const catData: Record<string, number> = {};
  filtered.filter(t => t.type === 'expense').forEach(t => {
    catData[t.category] = (catData[t.category] || 0) + t.amount;
  });

  const catLabels = Object.keys(catData);
  const catValues = Object.values(catData);

  const categoryChartEl = document.getElementById('categoryChart') as HTMLCanvasElement;
  if (categoryChartEl) {
    if (categoryChart) categoryChart.destroy();
    const ctxCat = categoryChartEl.getContext('2d');
    if (ctxCat) {
      // @ts-ignore
      categoryChart = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{ data: catValues, backgroundColor: COLORS }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '70%'
        }
      });
    }
  }

  // Legend
  const legend = document.getElementById('categoryLegend');
  if (legend) {
    legend.innerHTML = catLabels.map((l, i) => `
      <div class="d-flex justify-content-between align-items-center small mb-1">
        <div class="d-flex align-items-center gap-2">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${COLORS[i % COLORS.length]}"></div>
          <span class="text-muted">${l}</span>
        </div>
        <span class="fw-bold">$${catData[l].toLocaleString()}</span>
      </div>
    `).join('');
  }
}

// Events
if (transactionForm) {
  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amountEl = document.getElementById('amount') as HTMLInputElement;
    const descriptionEl = document.getElementById('description') as HTMLInputElement;
    const dateEl = document.getElementById('date') as HTMLInputElement;
    
    const amount = parseFloat(amountEl.value);
    const description = descriptionEl.value;
    const category = categorySelect.value;
    const date = dateEl.value;
    const typeInput = Array.from(typeInputs).find(r => (r as HTMLInputElement).checked) as HTMLInputElement;
    const type = typeInput.value;

    const newT = { id: Date.now().toString(), amount, description, category, date, type };
    transactions.push(newT);
    localStorage.setItem('finanzapro_data', JSON.stringify(transactions));
    
    transactionForm.reset();
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
    updateCategoryOptions();
    render();
  });
}

typeInputs.forEach(input => input.addEventListener('change', updateCategoryOptions));
if (filterMonthInput) filterMonthInput.addEventListener('change', render);

// @ts-ignore
window.deleteTransaction = (id) => {
  transactions = transactions.filter((t: any) => t.id !== id);
  localStorage.setItem('finanzapro_data', JSON.stringify(transactions));
  render();
};

if (btnExportPDF) {
  btnExportPDF.addEventListener('click', () => {
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const filterMonth = filterMonthInput ? filterMonthInput.value : '';
    const filtered = transactions.filter((t: any) => t.date.startsWith(filterMonth));
    
    const totals = filtered.reduce((acc: any, t: any) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });

    doc.setFillColor(33, 37, 41);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('FinanzaPro - Reporte Mensual', 14, 25);
    doc.setFontSize(10);
    doc.text(`Periodo: ${filterMonth} | Generado: ${new Date().toLocaleString()}`, 14, 33);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Resumen del Periodo', 14, 50);
    
    // @ts-ignore
    doc.autoTable({
      startY: 55,
      head: [['Concepto', 'Monto']],
      body: [
        ['Total Ingresos', `+$${totals.income.toLocaleString()}`],
        ['Total Gastos', `-$${totals.expense.toLocaleString()}`],
        ['Balance Neto', `$${(totals.income - totals.expense).toLocaleString()}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [33, 37, 41] }
    });

    doc.text('Detalle de Transacciones', 14, doc.lastAutoTable.finalY + 15);
    
    // @ts-ignore
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
      body: filtered.map((t: any) => [
        t.date,
        t.description,
        t.category,
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        `$${t.amount.toLocaleString()}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [108, 117, 125] }
    });

    doc.save(`reporte-${filterMonth}.pdf`);
  });
}

init();
