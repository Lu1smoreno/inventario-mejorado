// -- Estado global --
let perfil = null;
let nombreClienteActual = "";
let inventario = [], ventas = [], comparativa = [];
let invImport = false, ventasImport = false, compImport = false;
let ultimoSessionId = null;

const STORAGE_KEY_SESSIONS = "sessions";
const STORAGE_KEY_CLIENTS = "recentClients";
const MAX_CLIENTS = 10;

// --- Utilidades globales ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- Registro ---
window.registerUser = function() {
    const email = document.getElementById('regEmail').value.trim();
    const nombre = document.getElementById('regNombre').value.trim();
    if (!email || !nombre) {
        Swal.fire('Error', 'Por favor, introduce tu correo y nombre.', 'error');
        return;
    }
    perfil = { email, nombre };
    document.getElementById('registerContainer').style.display = 'none';
    document.getElementById('userformContainer').style.display = '';
    document.getElementById('perfilInfo').innerHTML =
        `<b>Bienvenido/a, ${nombre}</b> <br><span class="small">${email}</span>`;
    clearForm();
    loadRecentClients();
}

// --- Cliente ---
window.toggleDropdown = function() {
    document.getElementById('userDropdown').classList.toggle('open');
}
window.setClientName = function() {
    const input = document.getElementById('nombreClienteInput').value.trim();
    if (!input) {
        nombreClienteActual = "";
        showMsg('labelCliente', 'Nombre de cliente: No especificado', 'waiting');
    } else {
        nombreClienteActual = input;
        showMsg('labelCliente', "Nombre de Cliente: " + nombreClienteActual, 'imported');
        saveRecentClient(input);
    }
    enableButtons(!!nombreClienteActual);
}
window.clearForm = function() {
    document.getElementById('nombreClienteInput').value = '';
    nombreClienteActual = "";
    showMsg('labelCliente', 'Introduce el nombre del cliente', 'waiting');
    showMsg('labelInv', 'Esperando Inventario...', 'waiting');
    showMsg('labelVentas', 'Esperando Ventas...', 'waiting');
    showMsg('labelComp', 'Esperando Comparativa...', 'waiting');
    document.getElementById('btnImportInv').disabled = true;
    document.getElementById('btnImportVentas').disabled = true;
    document.getElementById('btnImportComp').disabled = true;
    document.getElementById('btnProcesar').disabled = true;
    document.getElementById('btnDashboard').disabled = true;
    document.getElementById('dashboardContainer').style.display = "none";
    inventario = []; ventas = []; comparativa = []; invImport = ventasImport = compImport = false;
}
window.selectRecentClient = function(val) {
    if (val && val !== "") {
        document.getElementById('nombreClienteInput').value = val;
        setClientName();
    }
}
function enableButtons(activo) {
    document.getElementById('btnImportInv').disabled = !activo;
    document.getElementById('btnImportVentas').disabled = !activo;
    document.getElementById('btnImportComp').disabled = !activo;
    document.getElementById('btnProcesar').disabled = true;
    document.getElementById('btnDashboard').disabled = true;
    document.getElementById('dashboardContainer').style.display = "none";
    inventario = []; ventas = []; comparativa = []; invImport = ventasImport = compImport = false;
}
function showMsg(id, txt, tipo) {
    let el = document.getElementById(id);
    el.childNodes[0].textContent = txt;
    el.className = 'status-label ' + tipo;
}
function saveRecentClient(name) {
    let arr = JSON.parse(localStorage.getItem(STORAGE_KEY_CLIENTS) || "[]");
    arr = [name, ...arr.filter(n => n !== name)];
    if (arr.length > MAX_CLIENTS) arr.length = MAX_CLIENTS;
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(arr));
    loadRecentClients();
}
function loadRecentClients() {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY_CLIENTS) || "[]");
    const sel = document.getElementById('clientesRecientes');
    sel.innerHTML = `<option value="">--Historial--</option>`;
    arr.forEach(name => {
        sel.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

// --- Importación de archivos ---
document.getElementById('fileInventario').addEventListener('change', e => {
    readFile(e.target.files[0], data => {
        if (!validateColumns(data[0], ["CODIGO", "DESCRIPCION", "STOCK", "COSTE", "VENTA"])) return;
        inventario = data;
        invImport = true;
        showMsg('labelInv', 'Inventario: Importado', 'imported');
        checkAllFiles();
    });
});
document.getElementById('fileVentas').addEventListener('change', e => {
    readFile(e.target.files[0], data => {
        if (!validateColumns(data[0], ["CODIGO", "CLIENTE", "CANTIDAD"])) return;
        ventas = data;
        ventasImport = true;
        showMsg('labelVentas', 'Ventas: Importadas', 'imported');
        checkAllFiles();
    });
});
document.getElementById('fileComparativa').addEventListener('change', e => {
    readFile(e.target.files[0], data => {
        if (!validateColumns(data[0], ["CODIGO", "PRODUCTO", "CANTIDAD", "PRECIO"])) return;
        comparativa = data;
        compImport = true;
        showMsg('labelComp', 'Comparativa: Importada', 'imported');
        checkAllFiles();
    });
});

function readFile(file, cb) {
    if (!file) {
        Swal.fire('Atención', 'No se seleccionó ningún archivo.', 'warning');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        Swal.fire('Archivo grande', 'El archivo supera los 2MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            let data = new Uint8Array(e.target.result);
            let workbook = XLSX.read(data, {type: 'array'});
            let sheet = workbook.Sheets[workbook.SheetNames[0]];
            let arr = XLSX.utils.sheet_to_json(sheet, {header:1});
            cb(arr);
        } catch (error) {
            Swal.fire('Error', 'No se pudo leer el archivo. ¿Es un Excel/CSV válido?', 'error');
        }
    };
    reader.onerror = () => {
        Swal.fire('Error', 'Hubo un problema al leer el archivo.', 'error');
    };
    reader.readAsArrayBuffer(file);
}

function validateColumns(headers, expected) {
    if (!headers) {
        Swal.fire('Error', 'El archivo está vacío.', 'error'); return false;
    }
    const faltantes = expected.filter(col => !headers.map(h => (h||"").toString().trim().toUpperCase()).includes(col));
    if (faltantes.length) {
        Swal.fire('Error de archivo', 'Faltan estas columnas: ' + faltantes.join(', '), 'error');
        return false;
    }
    return true;
}
function checkAllFiles() {
    if (invImport && ventasImport && compImport) {
        document.getElementById('btnProcesar').disabled = false;
    }
}

// --- Procesamiento y KPIs ---
window.processData = function() {
    if (!(invImport && ventasImport && compImport)) {
        Swal.fire('Atención', 'Debes importar Inventario, Ventas y Comparativa.', 'warning');
        return;
    }
    showMsg('labelCliente', 'Procesando datos... Espere.', 'waiting');
    setTimeout(() => {
        const processedData = calcDashboardData(inventario, ventas, comparativa, nombreClienteActual);
        ultimoSessionId = saveSession(processedData);
        showMsg('labelCliente', 'Datos procesados. Ver resultados.', 'imported');
        document.getElementById('btnDashboard').disabled = false;
        Swal.fire('¡Éxito!', 'Datos procesados. Ahora puedes ver los resultados.', 'success');
    }, 600);
}
window.showDashboard = function() {
    if (!ultimoSessionId) {
        Swal.fire("Primero procesa los datos");
        return;
    }
    const session = getSessionById(ultimoSessionId);
    if (!session) return Swal.fire("Error de sesión");
    document.getElementById('dashboardContainer').style.display = "";
    renderDashboard(session);
}
function calcDashboardData(inventario, ventas, comparativa, nombreCliente) {
    // Similar to your original, but robust for missing values.
    let totalRefs = inventario.length - 1;
    let valorInventario = 0, stockMuerto = 0, stockCritico = 0, ventasNeto = 0, ventasTotalesComp = 0, margenTotal = 0, contadorMargen = 0;
    let recs = [];
    let ventasArray = [];
    const IDX = { COD: 0, DESC: 1, STOCK: 2, COSTE: 3, VENTA: 4 };
    let ventasMap = {}, compMap = {};

    ventas.slice(1).forEach(row => {
        if (row[0]) ventasMap[row[0]] = Number(row[2]) || 0;
    });
    comparativa.slice(1).forEach(row => {
        if (row[0]) compMap[row[0]] = Number(row[2]) || 0;
    });

    let statusCount = { sano:0, critico:0, muerto:0, bajo:0, sinventas:0 };

    inventario.slice(1).forEach(row => {
        let stock = Number(row[IDX.STOCK]) || 0;
        let coste = Number(row[IDX.COSTE]) || 0;
        let venta = Number(row[IDX.VENTA]) || 0;
        let ventasCliente = ventasMap[row[IDX.COD]] || 0;
        let ventasMercado = compMap[row[IDX.COD]] || 0;

        valorInventario += stock * coste;

        if (stock === 0) {
            stockMuerto++;
            if (ventasCliente === 0) statusCount.muerto++;
        }
        if (stock > 0 && stock < 5) { stockCritico++; statusCount.critico++; }
        if (ventasCliente === 0) statusCount.sinventas++;
        if (stock >= 5 && ventasCliente > 0) statusCount.sano++;

        ventasNeto += ventasCliente * venta;
        ventasArray.push({ cod: row[IDX.COD], desc: row[IDX.DESC], ventas: ventasCliente });

        if (venta > 0) {
            margenTotal += (venta - coste) / venta;
            contadorMargen++;
        }

        let alertClass = '', alertLabel = '';
        if (ventasCliente === 0)     { alertClass = 'sinventas'; alertLabel = '❌ SIN VENTAS'; }
        else if (stock === 0) {
            if (ventasCliente >= 10)   { alertClass = 'urgente'; alertLabel = '🔴 URGENTE'; }
            else if (ventasCliente >= 3){ alertClass = 'critico'; alertLabel = '🟠 CRÍTICO'; }
            else                      { alertClass = 'bajo'; alertLabel = '🟡 BAJO STOCK'; }
        }
        else if (stock < 3 && ventasCliente > 0) { alertClass = 'bajo'; alertLabel = '🟡 BAJO STOCK'; }
        else if (ventasCliente / (stock || 1) > 3) { alertClass = 'optimo'; alertLabel = '✔️ ÓPTIMO'; }
        else if (ventasCliente < 2)           { alertClass = 'lento'; alertLabel = 'ℹ️ LENTO'; }
        else                                 { alertClass = 'optimo'; alertLabel = '✔️ ÓPTIMO'; }

        recs.push({
            cod: row[IDX.COD],
            desc: row[IDX.DESC] || 'N/A',
            stock,
            coste: coste.toFixed(2),
            venta: venta.toFixed(2),
            ventasCliente,
            ventasMercado,
            alertClass,
            alertLabel
        });
    });

    ventasTotalesComp = comparativa.slice(1).reduce((sum, row) => sum + (Number(row[2] || 0) * Number(row[3] || 0)), 0);

    let kpis = {
        totalRefs,
        valorInventario: valorInventario.toFixed(2),
        ventasNeto: ventasNeto.toFixed(2),
        stockMuerto,
        stockCritico,
        cuota: ventasTotalesComp ? (ventasNeto / ventasTotalesComp * 100).toFixed(2) + "%" : "N/A",
        margen: contadorMargen ? (margenTotal / contadorMargen * 100).toFixed(2) + "%" : "N/A"
    };
    ventasArray.sort((a, b) => b.ventas - a.ventas);
    const top10VentasLabels = ventasArray.slice(0, 10).map(item => item.cod);
    const top10VentasData = ventasArray.slice(0, 10).map(item => item.ventas);
    const top10VentasDesc = ventasArray.slice(0, 10).map(item => item.desc);

    return {
        nombreCliente: nombreCliente,
        kpis: kpis,
        recs: recs,
        statusCount: statusCount,
        top10VentasLabels: top10VentasLabels,
        top10VentasData: top10VentasData,
        top10VentasDesc: top10VentasDesc,
        margenNumerico: contadorMargen ? (margenTotal / contadorMargen * 100) : 0,
        createdAt: new Date().toISOString()
    };
}

// --- Dashboard y filtros ---
function renderDashboard(session) {
    // KPIs
    const kpiBox = (title, value) => `<div class="kpi-box"><div class="kpi-value">${value}</div><div>${title}</div></div>`;
    let html = "";
    html += kpiBox("Referencias", session.kpis.totalRefs);
    html += kpiBox("Valor Inventario", session.kpis.valorInventario);
    html += kpiBox("Ventas Neto", session.kpis.ventasNeto);
    html += kpiBox("Stock Muerto", session.kpis.stockMuerto);
    html += kpiBox("Stock Crítico", session.kpis.stockCritico);
    html += kpiBox("Margen Prom.", session.kpis.margen);
    html += kpiBox("Cuota Mercado", session.kpis.cuota);
    document.getElementById('dashboardKpis').innerHTML = html;

    // Table
    renderTable(session.recs);

    // Filtro
    document.getElementById('filterInput').value = "";
    document.getElementById('filterInput').oninput = function() {
        const val = this.value.trim().toLowerCase();
        let recs = session.recs;
        if (val.length > 0) {
            recs = recs.filter(r => (r.cod||"").toLowerCase().includes(val) || (r.desc||"").toLowerCase().includes(val));
        }
        renderTable(recs);
    };

    // Chart
    renderChart(session.top10VentasLabels, session.top10VentasData, session.top10VentasDesc);
}
function renderTable(recs) {
    let html = `<table style="width:100%;font-size:.99em;"><thead><tr>
        <th>Código</th><th>Descripción</th><th>Stock</th><th>Coste</th><th>Venta</th>
        <th>Ventas Cliente</th><th>Ventas Mercado</th><th>Estatus</th></tr></thead><tbody>`;
    recs.forEach(r => {
        html += `<tr>
            <td>${escapeHTML(r.cod)}</td>
            <td>${escapeHTML(r.desc)}</td>
            <td>${r.stock}</td>
            <td>${r.coste}</td>
            <td>${r.venta}</td>
            <td>${r.ventasCliente}</td>
            <td>${r.ventasMercado}</td>
            <td><span class="alert ${r.alertClass}">${r.alertLabel}</span></td>
        </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById('dashboardTable').innerHTML = html;
}
function renderChart(labels, data, descs) {
    const ctx = document.getElementById('ventasChart').getContext('2d');
    if (window._ventasChart) window._ventasChart.destroy();
    window._ventasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map((l,i) => l + (descs[i] ? " - " + descs[i] : "")),
            datasets: [{
                label: "Ventas (Top 10)",
                data: data,
                backgroundColor: '#446ccc90'
            }]
        },
        options: {
            plugins: { legend: { display: false }},
            responsive: true,
            scales: { y: { beginAtZero:true } }
        }
    });
}
function escapeHTML(txt) {
    return (''+txt).replace(/[<>"'&]/g, s => ({
        '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'
    }[s]));
}

// --- Sesiones / historial ---
function saveSession(data) {
    let arr = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || "[]");
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2,8);
    arr.unshift({id, ...data});
    if (arr.length > 30) arr.length = 30;
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(arr));
    return id;
}
function getSessionById(id) {
    let arr = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || "[]");
    return arr.find(s => s.id === id);
}
window.showHistory = function() {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || "[]");
    let html = "";
    arr.forEach(s => {
        html += `<li>
            <b>${escapeHTML(s.nombreCliente||"")}</b>
            <span class="small">${new Date(s.createdAt).toLocaleString()}</span>
            <button onclick="loadHistorySession('${s.id}')">Cargar</button>
            <button onclick="deleteHistorySession('${s.id}')">Eliminar</button>
        </li>`;
    });
    document.getElementById('historyList').innerHTML = html || "<li>No hay historial.</li>";
    document.getElementById('historyContainer').style.display = "";
    document.getElementById('dashboardContainer').style.display = "none";
}
window.closeHistory = function() {
    document.getElementById('historyContainer').style.display = "none";
}
window.loadHistorySession = function(id) {
    ultimoSessionId = id;
    document.getElementById('historyContainer').style.display = "none";
    showDashboard();
}
window.deleteHistorySession = function(id) {
    let arr = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || "[]");
    arr = arr.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(arr));
    showHistory();
}

// --- Exportar/Importar sesión ---
window.exportSession = function() {
    if (!ultimoSessionId) return Swal.fire("Primero procesa los datos");
    const session = getSessionById(ultimoSessionId);
    if (!session) return Swal.fire("Error de sesión");
    const blob = new Blob([JSON.stringify(session,null,2)], {type:"application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inventario_${session.nombreCliente||"Sesion"}_${session.createdAt.split("T")[0]}.json`;
    a.click();
}
window.importSession = function() {
    document.getElementById('importSessionFile').click();
}
document.getElementById('importSessionFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return Swal.fire('Archivo grande', 'El archivo supera los 2MB.', 'error');
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const session = JSON.parse(ev.target.result);
            if (!session.kpis || !session.recs) throw Error("Formato inválido");
            ultimoSessionId = saveSession(session);
            Swal.fire("Importado", "Sesión importada correctamente.", "success");
        } catch (e) {
            Swal.fire("Error", "No se pudo importar: "+e, "error");
        }
    };
    reader.readAsText(file);
});

// --- Logout ---
window.logout = function() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: "¿Seguro que quieres salir? Se borrarán los datos importados.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'No, cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            perfil = null;
            ultimoSessionId = null;
            document.getElementById('registerContainer').style.display = '';
            document.getElementById('userformContainer').style.display = 'none';
            clearForm();
            Swal.fire('¡Hasta pronto!', 'Has cerrado sesión.', 'success');
        }
    });
};