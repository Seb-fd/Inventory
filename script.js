const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxj9QZGXhlrrzPO7QTmCOjAMTEnJXwA5PtbF4YTTMEnIJ9GIMZTPs2THF51Tc_OBbB4/exec";

const mobileToggle = document.getElementById("mobileToggle");
const sidebar = document.querySelector(".sidebar");
let inventarioCargado = false;
let inventarioCache = [];

// Crear botón móvil si no existe
if (!mobileToggle) {
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "mobile-toggle hidden";
  toggleBtn.id = "mobileToggle";
  toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
  document.body.appendChild(toggleBtn);
}

const mobileToggleBtn = document.getElementById("mobileToggle");

if (mobileToggleBtn && sidebar) {
  // Verificar ancho de pantalla
  function checkMobile() {
    if (window.innerWidth <= 992) {
      mobileToggleBtn.classList.remove("hidden");
    } else {
      mobileToggleBtn.classList.add("hidden");
      sidebar.classList.remove("active");
    }
  }

  // Inicializar
  checkMobile();

  // Redimensionamiento
  window.addEventListener("resize", checkMobile);

  // Toggle del menú
  mobileToggleBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    sidebar.classList.toggle("active");
  });

  // Cerrar menú al hacer clic fuera
  document.addEventListener("click", function (e) {
    if (
      window.innerWidth <= 992 &&
      sidebar.classList.contains("active") &&
      !sidebar.contains(e.target) &&
      !mobileToggleBtn.contains(e.target)
    ) {
      sidebar.classList.remove("active");
    }
  });

  // Cerrar menú al hacer clic en enlace
  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 992) {
        sidebar.classList.remove("active");
      }
    });
  });
}

// Optimizar tablas para móviles
function optimizeTablesForMobile() {
  const tableContainers = document.querySelectorAll(".data-table-container");

  tableContainers.forEach((container) => {
    const table = container.querySelector(".data-table");
    const hint = container.querySelector(".scroll-hint");

    if (table && window.innerWidth <= 768) {
      // Mostrar hint de scroll
      if (hint) {
        hint.classList.remove("hidden");
      }

      // Verificar si la tabla es más ancha que el contenedor
      const tableWidth = table.scrollWidth;
      const containerWidth = container.clientWidth;

      if (tableWidth > containerWidth && hint) {
        hint.classList.remove("hidden");
      } else if (hint) {
        hint.classList.add("hidden");
      }
    } else if (hint) {
      // Ocultar hint en pantallas grandes
      hint.classList.add("hidden");
    }
  });
}

// Inicializar optimización de tablas
optimizeTablesForMobile();

// Re-optimizar al redimensionar
window.addEventListener("resize", optimizeTablesForMobile);

// Ajustar botones para evitar texto desbordado
function adjustButtons() {
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((btn) => {
    const text = btn.textContent || btn.innerText;
    if (text.length > 30) {
      btn.style.fontSize = "0.8rem";
      btn.style.padding = "var(--space-2) var(--space-3)";
    }
  });
}

// Ajustar después de cargar la página
setTimeout(adjustButtons, 500);

let productDataCache = {};
let resumenFinancieroChart, tendenciasChart;

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  loadInitialData();
  setupForms();
});

function setupNavigation() {
  const navLinks = document.querySelectorAll(".sidebar-nav a");
  const sections = document.querySelectorAll(".main-content .content-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("data-section");

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      sections.forEach((section) => {
        if (section.id === targetId) {
          section.classList.add("active");

          if (targetId === "dashboard") {
            handleLoadDashboard();
          }

          if (targetId === "inventario") {
            loadInventario();
          }

          if (targetId === "ventas") {
            prepararPOS();
          }
        } else {
          section.classList.remove("active");
        }
      });
    });
  });
}

async function loadInitialData() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getCategorias`);
    const data = await response.json();

    if (data.status === "success") {
      populateCategories(data.data);
    } else {
      displayStatus(
        "statusProducto",
        "warning",
        `No se pudieron cargar las categorías: ${data.message}.`,
      );
      populateCategories([]);
    }
  } catch (error) {
    displayStatus(
      "statusProducto",
      "error",
      `Error de conexión al cargar categorías.`,
    );
    populateCategories([]);
  }
}

function populateCategories(categories) {
  const selectProducto = document.getElementById("p_categoria");
  selectProducto.innerHTML = "";

  if (categories.length === 0) {
    selectProducto.innerHTML =
      '<option value="" disabled selected>No hay categorías registradas</option>';
    document.getElementById("listaCategorias").innerHTML =
      "<li>No hay categorías.</li>";
    return;
  }

  selectProducto.innerHTML =
    '<option value="" disabled selected>Seleccione una categoría</option>';

  const listHtml = categories
    .map((cat) => {
      const name = cat.nombre || `(ID ${cat.id})`;
      selectProducto.innerHTML += `<option value="${name}">${name}</option>`;
      return `<li>ID: ${cat.id} | Nombre: ${name}</li>`;
    })
    .join("");

  document.getElementById("listaCategorias").innerHTML = listHtml;
}

function setupForms() {
  // Configuración
  document
    .getElementById("iniciarDBBtn")
    .addEventListener("click", () => handleConfigAction("iniciar"));
  document.getElementById("resetDBBtn").addEventListener("click", () => {
    if (
      window.confirm(
        "¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.",
      )
    ) {
      handleConfigAction("resetear");
    }
  });

  // Categorías y Productos
  document
    .getElementById("categoriaForm")
    .addEventListener("submit", (e) =>
      handlePostAction(e, "agregarCategoria", "statusCategoria"),
    );
  document
    .getElementById("productoForm")
    .addEventListener("submit", (e) =>
      handlePostAction(e, "agregarProducto", "statusProducto"),
    );

  // Compras/Ventas
  const coQuery = document.getElementById("co_query");
  if (coQuery) {
    coQuery.addEventListener("input", (e) =>
      handleQueryFilter(e.target.value, "co"),
    );
  }

  document
    .getElementById("compraForm")
    .addEventListener("submit", (e) => handleTransactionPost(e, "compra"));
  const vQuery = document.getElementById("v_query");
  if (vQuery) {
    vQuery.addEventListener("input", (e) =>
      handleQueryFilter(e.target.value, "v"),
    );
  }

  const ventaForm = document.getElementById("ventaForm");
  if (ventaForm) {
    ventaForm.addEventListener("submit", (e) =>
      handleTransactionPost(e, "venta"),
    );
  }

  // Resúmenes
  document
    .getElementById("resumenVentasBtn")
    .addEventListener("click", () => loadSummary("Ventas"));
  document
    .getElementById("resumenComprasBtn")
    .addEventListener("click", () => loadSummary("Compras"));

  // Dashboard
  document
    .getElementById("cargarInventarioBtn")
    .addEventListener("click", loadInventario);
  document
    .getElementById("cargarDatosGraficosBtn")
    .addEventListener("click", handleLoadDashboard);
  document
    .getElementById("calcularResumenBtn")
    .addEventListener("click", calcularResumenFinanciero);
}

// ================= DASHBOARD FUNCTIONS =================

async function handleLoadDashboard() {
  await calcularResumenFinanciero();
  await cargarDatosGraficos();
}

async function calcularResumenFinanciero() {
  displayStatus("statusDashboard", "info", "Calculando resumen financiero...");

  try {
    // Obtener datos de ventas y compras
    const [ventasResponse, comprasResponse] = await Promise.all([
      fetch(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
      fetch(`${SCRIPT_URL}?action=getData&sheetName=COMPRAS`),
    ]);

    const ventasData = await ventasResponse.json();
    const comprasData = await comprasResponse.json();

    let totalVentas = 0;
    let totalCompras = 0;

    // Calcular total de ventas
    if (ventasData.status === "success" && ventasData.data) {
      totalVentas = ventasData.data.reduce((sum, venta) => {
        return sum + Number(venta.total_final || 0);
      }, 0);
    }

    // Calcular total de compras
    if (comprasData.status === "success" && comprasData.data) {
      totalCompras = comprasData.data.reduce((sum, compra) => {
        return (
          sum + parseFloat(compra.cantidad) * parseFloat(compra.precio_compra)
        );
      }, 0);
    }

    const ganancias = totalVentas - totalCompras;

    // Actualizar estadísticas
    document.getElementById("totalVentas").textContent =
      `$${formatearCOP(totalVentas)}`;
    document.getElementById("totalCompras").textContent =
      `$${formatearCOP(totalCompras)}`;
    document.getElementById("totalGanancias").textContent =
      `$${formatearCOP(ganancias)}`;
    document.getElementById("totalGastos").textContent =
      `$${formatearCOP(totalCompras)}`;

    // Colores según ganancias
    const gananciasElement = document.getElementById("totalGanancias");
    if (ganancias > 0) {
      gananciasElement.style.color = "var(--secondary-color)";
    } else if (ganancias < 0) {
      gananciasElement.style.color = "var(--danger-color)";
    } else {
      gananciasElement.style.color = "#666";
    }

    displayStatus(
      "statusDashboard",
      "success",
      `Resumen calculado: Ventas: $${formatearCOP(totalVentas)} | Compras: $${formatearCOP(totalCompras)} | Ganancia: $${formatearCOP(ganancias)}`,
    );

    return { totalVentas, totalCompras, ganancias };
  } catch (error) {
    displayStatus(
      "statusDashboard",
      "error",
      `Error al calcular resumen: ${error.message}`,
    );
    return { totalVentas: 0, totalCompras: 0, ganancias: 0 };
  }
}

async function cargarDatosGraficos() {
  try {
    // Obtener datos para gráficos
    const resumenResponse = await fetch(
      `${SCRIPT_URL}?action=getResumenDiario`,
    );
    const resumenData = await resumenResponse.json();

    if (
      resumenData.status === "success" &&
      resumenData.data &&
      resumenData.data.length > 0
    ) {
      renderCharts(resumenData.data);
    } else {
      // Si no hay datos en resumen_diario, usar datos de ventas/compras
      await renderChartsFromRawData();
    }
  } catch (error) {
    displayStatus(
      "statusDashboard",
      "error",
      `Error al cargar gráficos: ${error.message}`,
    );
  }
}

async function renderChartsFromRawData() {
  try {
    const [ventasResponse, comprasResponse] = await Promise.all([
      fetch(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
      fetch(`${SCRIPT_URL}?action=getData&sheetName=COMPRAS`),
    ]);

    const ventasData = await ventasResponse.json();
    const comprasData = await comprasResponse.json();

    // Agrupar por fecha
    const ventasPorFecha = {};
    const comprasPorFecha = {};

    if (ventasData.status === "success" && ventasData.data) {
      ventasData.data.forEach((venta) => {
        const fecha = new Date(venta.fecha).toLocaleDateString();
        const monto = Number(venta.total_final || 0);
        ventasPorFecha[fecha] = (ventasPorFecha[fecha] || 0) + monto;
      });
    }

    if (comprasData.status === "success" && comprasData.data) {
      comprasData.data.forEach((compra) => {
        const fecha = new Date(compra.fecha).toLocaleDateString();
        const monto =
          parseFloat(compra.cantidad) * parseFloat(compra.precio_compra);
        comprasPorFecha[fecha] = (comprasPorFecha[fecha] || 0) + monto;
      });
    }

    // Combinar fechas
    const todasFechas = [
      ...new Set([
        ...Object.keys(ventasPorFecha),
        ...Object.keys(comprasPorFecha),
      ]),
    ];
    todasFechas.sort((a, b) => new Date(a) - new Date(b));

    const datosResumen = todasFechas.map((fecha) => ({
      fecha: fecha,
      total_ventas: ventasPorFecha[fecha] || 0,
      total_compras: comprasPorFecha[fecha] || 0,
      ganancia: (ventasPorFecha[fecha] || 0) - (comprasPorFecha[fecha] || 0),
    }));

    renderCharts(datosResumen);
  } catch (error) {
    console.error("Error al procesar datos para gráficos:", error);
    displayStatus(
      "statusDashboard",
      "warning",
      "No hay datos suficientes para generar gráficos.",
    );
  }
}

function renderCharts(resumenData) {
  const labels = resumenData.map((row) => {
    if (row.fecha instanceof Date) {
      return row.fecha.toLocaleDateString();
    }
    return row.fecha;
  });

  const ventas = resumenData.map((row) => row.total_ventas || 0);
  const compras = resumenData.map((row) => row.total_compras || 0);
  const ganancias = resumenData.map((row) => row.ganancia || 0);

  // 1. Gráfico de Resumen Financiero
  const ctx1 = document
    .getElementById("resumenFinancieroChart")
    .getContext("2d");
  if (resumenFinancieroChart) resumenFinancieroChart.destroy();
  resumenFinancieroChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ventas",
          data: ventas,
          backgroundColor: "rgba(0, 123, 255, 0.7)",
          borderColor: "rgba(0, 123, 255, 1)",
          borderWidth: 1,
        },
        {
          label: "Compras",
          data: compras,
          backgroundColor: "rgba(23, 162, 184, 0.7)",
          borderColor: "rgba(23, 162, 184, 1)",
          borderWidth: 1,
        },
        {
          label: "Ganancias",
          data: ganancias,
          type: "line",
          fill: false,
          backgroundColor: "rgba(40, 167, 69, 0.7)",
          borderColor: "rgba(40, 167, 69, 1)",
          borderWidth: 2,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Resumen Financiero - Ventas, Compras y Ganancias",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Monto ($)",
          },
        },
      },
    },
  });

  // 2. Gráfico de Tendencias
  const ctx2 = document.getElementById("tendenciasChart").getContext("2d");
  if (tendenciasChart) tendenciasChart.destroy();
  tendenciasChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ventas Acumuladas",
          data: ventas.reduce(
            (acc, curr, i) => [...acc, (acc[i - 1] || 0) + curr],
            [],
          ),
          borderColor: "rgba(0, 123, 255, 1)",
          backgroundColor: "rgba(0, 123, 255, 0.1)",
          tension: 0.1,
          fill: true,
        },
        {
          label: "Compras Acumuladas",
          data: compras.reduce(
            (acc, curr, i) => [...acc, (acc[i - 1] || 0) + curr],
            [],
          ),
          borderColor: "rgba(23, 162, 184, 1)",
          backgroundColor: "rgba(23, 162, 184, 0.1)",
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Tendencias Acumuladas - Ventas vs Compras",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Monto Acumulado ($)",
          },
        },
      },
    },
  });
}

// ================= REST OF THE FUNCTIONS (sin cambios) =================

async function handlePostAction(e, action, statusDivId) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = e.submitter;
  submitBtn.disabled = true;
  displayStatus(statusDivId, "info", `Procesando...`);

  const data = {};
  Array.from(form.elements).forEach((input) => {
    if (input.id && (input.id.startsWith("p_") || input.id.startsWith("c_"))) {
      let valor = input.value;

      // 🔥 Si es campo de dinero, limpiar antes de enviar
      if (input.classList.contains("money-input")) {
        valor = limpiarNumero(valor);
      }

      data[input.id.replace(/p_|c_/, "")] = valor;
    }
  });
  data.action = action;

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const responseData = await response.json();

    if (responseData.status === "success") {
      displayStatus(statusDivId, "success", responseData.message);
      form.reset();
      if (action === "agregarCategoria") {
        loadInitialData();
      }
    } else {
      displayStatus(statusDivId, "error", responseData.message);
    }
  } catch (error) {
    displayStatus(statusDivId, "error", `Error de conexión: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleQueryFilter(query, prefix) {
  const detailDiv = document.getElementById(`${prefix}_product_details`);
  const submitBtn = document.getElementById(`${prefix}_submit_btn`);
  const idInput = document.getElementById(`${prefix}_producto_id`);

  detailDiv.classList.add("hidden");
  detailDiv.innerHTML = "";
  idInput.value = "";
  submitBtn.disabled = true;

  if (query.length < 2) return;

  try {
    const response = await fetch(
      `${SCRIPT_URL}?action=buscarProducto&query=${encodeURIComponent(query)}`,
    );
    const data = await response.json();

    if (data.status === "success" && data.data && data.data.length > 0) {
      const product = data.data[0];
      productDataCache[product.id] = product;
      updateProductDetails(product, detailDiv, prefix);
      idInput.value = product.id;
      submitBtn.disabled = false;
    } else {
      detailDiv.classList.remove("hidden");
      detailDiv.innerHTML = `<p style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> ${
        data.message || "No se encontraron productos."
      }</p>`;
    }
  } catch (error) {
    detailDiv.classList.remove("hidden");
    detailDiv.innerHTML = `<p style="color:var(--danger-color);">Error de búsqueda: ${error.message}</p>`;
  }
}

function updateProductDetails(product, detailDiv, prefix) {
  detailDiv.classList.remove("hidden");

  const isCompra = prefix === "co";
  const priceLabel = isCompra ? "Precio Compra Actual" : "Precio Venta Actual";
  const basePrice = isCompra ? product.precio_compra : product.precio_venta;

  const stockStyle =
    product.stock < 5
      ? 'style="font-weight:bold; color:var(--danger-color);"'
      : 'style="font-weight:bold; color:var(--secondary-color);"';

  detailDiv.innerHTML = `
                <p><b>ID:</b> ${product.id} | <b>Producto:</b> ${
                  product.nombre
                } (Cód: ${product.código})</p>
                <p><b>Categoría:</b> ${product.categoría}</p>
                <p><b>Stock Actual:</b> <span ${stockStyle}>${
                  product.stock
                }</span></p>
                <p><b>${priceLabel}:</b> $${formatearCOP(basePrice)}</p>
            `;

  const priceInput = document.getElementById(
    `${prefix}_precio_${isCompra ? "compra" : "venta"}`,
  );
  priceInput.value = parseFloat(basePrice);

  // 👇 SOLO PARA VENTAS: selector de precio
  if (!isCompra) {
    const priceSelect = document.getElementById("v_precio_tipo");

    const prices = {
      precio_venta: product.precio_venta,
      precio_venta_2: product.precio_venta_2 || product.precio_venta,
      precio_venta_3: product.precio_venta_3 || product.precio_venta,
      precio_venta_4: product.precio_venta_4 || product.precio_venta,
    };

    priceSelect.onchange = () => {
      const selected = priceSelect.value;
      priceInput.value = parseFloat(prices[selected]);
    };

    // Disparar cambio inicial
    priceSelect.dispatchEvent(new Event("change"));
  }

  if (!isCompra && product.stock < 5) {
    detailDiv.innerHTML += `
                    <p class="status-message warning" style="display:block; margin-top:10px;">
                        Stock bajo. Solo quedan ${product.stock} unidades.
                    </p>`;
  }
}

async function handleTransactionPost(e, type) {
  e.preventDefault();
  const form = e.target;
  const prefix = type === "compra" ? "co" : "v";
  const statusDivId = type === "compra" ? "statusCompra" : "statusVenta";

  const submitBtn = document.getElementById(`${prefix}_submit_btn`);
  submitBtn.disabled = true;
  displayStatus(statusDivId, "info", `Registrando ${type}...`);

  const productoId = document.getElementById(`${prefix}_producto_id`).value;

  if (!productoId) {
    displayStatus(
      statusDivId,
      "error",
      `No hay producto seleccionado. Busque y seleccione uno.`,
    );
    submitBtn.disabled = false;
    return;
  }

  const transaccionData = {
    action: "registrarTransaccion",
    producto_id: productoId,
    cantidad: document.getElementById(`${prefix}_cantidad`).value,
    precio: limpiarNumero(
      document.getElementById(
        `${prefix}_precio_${type === "compra" ? "compra" : "venta"}`,
      ).value,
    ),
    type: type,
    extra_data: document.getElementById(
      `${prefix}_${type === "compra" ? "proveedor" : "cliente"}`,
    ).value,
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(transaccionData),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const data = await response.json();

    if (data.status === "success") {
      displayStatus(statusDivId, "success", data.message);
      form.reset();
      delete productDataCache[productoId];
      document
        .getElementById(`${prefix}_product_details`)
        .classList.add("hidden");
    } else {
      displayStatus(statusDivId, "error", data.message);
    }
  } catch (error) {
    displayStatus(statusDivId, "error", `Error de conexión: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
  }
}

async function loadInventario() {
  displayStatus("statusInventario", "info", "Cargando datos de inventario...");
  const tableBody = document.getElementById("inventarioTableBody");
  tableBody.innerHTML = '<tr><td colspan="9">Cargando...</td></tr>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getInventario`);
    const data = await response.json();

    if (data.status === "success" && data.data && data.data.length > 0) {
      inventarioCache = data.data; // ✅ guardar
      inventarioCargado = true; // ✅ marcar estado

      // --- render tabla ---
      displayStatus(
        "statusInventario",
        "success",
        `Inventario cargado: ${data.data.length} productos.`,
      );
      // Cachear productos para POS (búsqueda instantánea)
      posProductCache = {};
      data.data.forEach((p) => {
        posProductCache[p.código] = p;
        posProductCache[p.id] = p;
      });

      tableBody.innerHTML = data.data
        .map((p) => {
          const stockStyle =
            p.stock < 5
              ? 'style="color: var(--danger-color); font-weight: bold;"'
              : "";

          const pv1 = Number(p.precio_venta) || 0;
          const pv2 = Number(p.precio_venta_2) || 0;
          const pv3 = Number(p.precio_venta_3) || 0;
          const pv4 = Number(p.precio_venta_4) || 0;
          const pc = Number(p.precio_compra) || 0;

          return `
                            <tr data-id="${p.id}">
                                <td>${p.nombre}</td>
                                <td>${p.código}</td>
                                <td>${p.categoría}</td>
                                <td ${stockStyle}>${p.stock}</td>
                                <td>$${formatearCOP(pc)}</td>
                                <td>$${formatearCOP(pv1)}</td>
                                <td>$${formatearCOP(pv2)}</td>
                                <td>$${formatearCOP(pv3)}</td>
                                <td>$${formatearCOP(pv4)}</td>
                            </tr>
                        `;
        })
        .join("");
    } else {
      displayStatus("statusInventario", "warning", data.message);
      tableBody.innerHTML =
        '<tr><td colspan="9">No hay productos en inventario.</td></tr>';
    }
  } catch (error) {
    displayStatus(
      "statusInventario",
      "error",
      `Error al cargar inventario: ${error.message}`,
    );
    tableBody.innerHTML =
      '<tr><td colspan="9">Error al cargar datos.</td></tr>';
  }
}

async function loadSummary(type) {
  const sheetName = type === "Ventas" ? "VENTAS" : "COMPRAS";
  displayStatus("statusResumen", "info", `Cargando resumen de ${sheetName}...`);
  const table = document.getElementById("resumenTable");
  const tableHead = table.querySelector("thead");
  const tableBody = document.getElementById("resumenTableBody");
  table.classList.add("hidden");
  tableBody.innerHTML = "";

  try {
    const response = await fetch(
      `${SCRIPT_URL}?action=getData&sheetName=${sheetName}`,
    );
    const data = await response.json();

    if (data.status === "success" && data.data.length > 0) {
      displayStatus(
        "statusResumen",
        "success",
        `${data.data.length} ${sheetName} registradas.`,
      );
      table.classList.remove("hidden");

      // 🔥 Definir columnas visibles manualmente
      const columnas = [
        { key: "fecha", label: "Fecha" },
        { key: "cliente", label: "Cliente" },
        { key: "metodo_pago", label: "Pago" },
        { key: "descuento_global_pct", label: "Dcto %" },
        { key: "total_final", label: "Total" },
        { key: "monto_recibido", label: "Recibido" },
        { key: "cambio", label: "Cambio" },
      ];

      // 🔹 Crear encabezados
      tableHead.innerHTML = `
  <tr>
    ${columnas.map((col) => `<th>${col.label}</th>`).join("")}
  </tr>
`;

      // 🔹 Crear filas
      tableBody.innerHTML = data.data
        .map((row) => {
          return `
      <tr onclick="mostrarFactura('${row.id_venta}')" style="cursor:pointer;">
        ${columnas
          .map((col) => {
            let value = row[col.key] ?? "";

            if (col.key === "fecha" && value) {
              value = new Date(value).toLocaleDateString();
            }

            if (
              col.key === "total_final" ||
              col.key === "monto_recibido" ||
              col.key === "cambio"
            ) {
              value = formatearCOP(value);
            }

            return `<td>${value}</td>`;
          })
          .join("")}
      </tr>
    `;
        })
        .join("");
    } else {
      displayStatus(
        "statusResumen",
        "warning",
        `No hay datos en la pestaña ${sheetName}.`,
      );
    }
  } catch (error) {
    displayStatus(
      "statusResumen",
      "error",
      `Error al cargar resumen: ${error.message}`,
    );
  }
}

async function handleConfigAction(action) {
  const statusConfig = document.getElementById("statusConfig");
  setButtonState(true);
  displayStatus("statusConfig", "info", `Procesando la acción de ${action}...`);

  try {
    const response = await fetch(`${SCRIPT_URL}?action=${action}`);
    const data = await response.json();

    if (data.status === "success") {
      displayStatus("statusConfig", "success", data.message);
      loadInitialData();
    } else {
      displayStatus("statusConfig", "error", data.message);
    }
  } catch (error) {
    displayStatus(
      "statusConfig",
      "error",
      `Error de conexión: ${error.message}.`,
    );
  } finally {
    setButtonState(false);
  }
}

function setButtonState(disabled) {
  document.getElementById("iniciarDBBtn").disabled = disabled;
  document.getElementById("resetDBBtn").disabled = disabled;
}

function displayStatus(elementId, type, message) {
  const el = document.getElementById(elementId);
  el.style.display = "block";
  el.className = `status-message ${type}`;
  el.innerHTML = `<i class="fas fa-${
    type === "success"
      ? "check"
      : type === "error"
        ? "times"
        : type === "warning"
          ? "exclamation-triangle"
          : "info"
  }-circle"></i> ${message}`;
}

// ================= CACHE DE PRODUCTOS =================
let posProductCache = {};

// ================= POS RÁPIDO =================

const posVenta = {
  items: [],
  subtotal: 0,
  descuento_global_pct: 0,
  total_con_descuento: 0,
};

const posInput = document.getElementById("posBuscar");
const posTabla = document.getElementById("posTabla");
const posTotal = document.getElementById("posTotal");

if (posInput) {
  posInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const query = posInput.value.trim();
      if (query !== "") {
        posBuscarProducto(query);
      }
      posInput.value = "";

      // 🔥 volver a enfocar automáticamente
      posInput.focus();
    }
  });
}

function posBuscarProducto(query) {
  const producto = posProductCache[query];

  if (!producto) {
    alert("Producto no encontrado");
    return;
  }

  posAgregarProducto(producto);
}

function posAgregarProducto(producto) {
  const item = posVenta.items.find((i) => i.producto_id === producto.id);

  const precios = {
    precio_venta: Number(producto.precio_venta) || 0,
    precio_venta_2: Number(producto.precio_venta_2) || 0,
    precio_venta_3: Number(producto.precio_venta_3) || 0,
    precio_venta_4: Number(producto.precio_venta_4) || 0,
  };

  if (item) {
    item.cantidad += 1;
  } else {
    posVenta.items.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      codigo: producto.código,
      cantidad: 1,
      precio_tipo: "precio_venta",
      precios,
      precio_unitario: precios.precio_venta,
      descuento_pct: 0,
      subtotal_original: 0,
      subtotal_final: 0,
    });
  }

  posRecalcular();
  posRender();
}

function posRecalcular() {
  let subtotalBase = 0;

  posVenta.items.forEach((item) => {
    item.precio_unitario = item.precios[item.precio_tipo];

    item.subtotal_original = item.precio_unitario * item.cantidad;

    const descuentoItem = item.subtotal_original * (item.descuento_pct / 100);

    item.subtotal_final = item.subtotal_original - descuentoItem;

    subtotalBase += item.subtotal_final;
  });

  // ✅ Guardar subtotal SIN descuento global
  posVenta.subtotal = subtotalBase;

  // ✅ Calcular descuento global
  const descuentoGlobalMonto =
    subtotalBase * (posVenta.descuento_global_pct / 100);

  const subtotalConDescuento = subtotalBase - descuentoGlobalMonto;

  // ✅ Guardar subtotal con descuento
  posVenta.total_con_descuento = subtotalConDescuento;

  actualizarComision();
}

function posRender() {
  posTabla.innerHTML = "";

  posVenta.items.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.codigo}</td>

      <td>
        <select onchange="posCambiarPrecio(${index}, this.value)">
          ${Object.entries(item.precios)
            .filter(([, v]) => v > 0)
            .map(
              ([key, value]) =>
                `<option value="${key}" ${
                  item.precio_tipo === key ? "selected" : ""
                }>$${formatearCOP(value)}</option>`,
            )
            .join("")}
        </select>
      </td>


      <td>
        <input
          type="number"
          min="0"
          value="${item.cantidad}"
          onchange="posActualizarCantidad(${index}, this.value)"
          style="width:60px"
        />
      </td>

      <td>
        <select onchange="posCambiarDescuento(${index}, this.value)">
          ${[0, 5, 10, 15, 20, 25, 30]
            .map(
              (p) =>
                `<option value="${p}" ${
                  item.descuento_pct == p ? "selected" : ""
                }>${p}%</option>`,
            )
            .join("")}
        </select>
      </td>


      <td>$${formatearCOP(item.subtotal_final)}</td>

      <td>
        <button
          class="btn danger-btn"
          onclick="posEliminarConfirmado(${index})"
        >
          Eliminar
        </button>

      </td>
    `;
    posTabla.appendChild(tr);
  });
}

function posEliminar(index) {
  posVenta.items.splice(index, 1);
  posRecalcular();
  posRender();
}

function posCambiarPrecio(index, tipo) {
  const item = posVenta.items[index];
  item.precio_tipo = tipo;

  posRecalcular();
  posRender();
}

function posCambiarDescuento(index, porcentaje) {
  posVenta.items[index].descuento_pct = Number(porcentaje);
  posRecalcular();
  posRender();
}

function posActualizarCantidad(index, value) {
  const cantidad = Number(value);

  if (cantidad === 0) {
    if (confirm("¿Deseas eliminar este producto del POS?")) {
      posEliminar(index);
      return;
    } else {
      posVenta.items[index].cantidad = 1;
    }
  } else if (cantidad > 0) {
    posVenta.items[index].cantidad = cantidad;
  }

  posRecalcular();
  posRender();
}

function posEliminarConfirmado(index) {
  if (confirm("¿Seguro que deseas eliminar este producto?")) {
    posEliminar(index);
  }
}

async function prepararPOS() {
  if (!inventarioCargado) {
    await loadInventario();
  }

  posVenta.items = [];
  posVenta.subtotal = 0;
  posVenta.descuento_global_pct = 0;
  document.getElementById("posDescuentoGlobal").value = 0;
  posRender();

  // 🔥 Forzar foco después de render y activación de sección
  setTimeout(() => {
    const input = document.getElementById("posBuscar");
    if (input) {
      input.focus();
      input.select(); // opcional: selecciona texto si lo hubiera
    }
  }, 150);
  document.getElementById("posMetodoPago").dispatchEvent(new Event("change"));
}

async function posConfirmarVenta() {
  if (posVenta.items.length === 0) {
    alert("No hay productos en la venta.");
    return;
  }

  const montoRecibidoInput = document.getElementById("posMontoRecibido");
  const clienteInput = document.getElementById("posCliente");

  // ✅ DECLARAR PRIMERO metodoPago
  const metodoPago = document.getElementById("posMetodoPago").value;

  let montoRecibido = limpiarNumero(montoRecibidoInput.value);

  // ✅ Si no es efectivo, forzar monto igual al total
  const comision = calcularComision(posVenta.total_con_descuento, metodoPago);
  const totalFinal = posVenta.total_con_descuento + comision;

  if (metodoPago !== "efectivo") {
    montoRecibido = totalFinal;
  }

  // ✅ Validación solo para efectivo
  if (metodoPago === "efectivo") {
    if (!montoRecibido || montoRecibido < totalFinal) {
      alert("Monto recibido insuficiente.");
      return;
    }
  }

  const ventaData = {
    action: "registrarVentaPOS",
    cliente: clienteInput?.value || "Mostrador",
    montoRecibido: montoRecibido,
    items: posVenta.items.map((item) => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio: item.precio_unitario,
      descuento_item_pct: item.descuento_pct,
    })),
    descuento_global_pct: posVenta.descuento_global_pct,
    metodoPago: metodoPago,
    comision: comision,
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(ventaData),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    const data = await response.json();
    if (data.status === "success") {
      // Guardar valores antes de limpiar
      const totalVenta = data.total;
      const cambioVenta = data.cambio;

      // Limpiar estado del POS
      posVenta.items = [];
      posVenta.total_con_descuento = 0;
      posRender();

      montoRecibidoInput.value = "";
      if (clienteInput) clienteInput.value = "";

      actualizarComision();

      inventarioCargado = false;

      // Mostrar confirmación
      mostrarFactura(data.id_venta || data.ventaId);

      // Volver a enfocar el input para el siguiente cliente
      const input = document.getElementById("posBuscar");
      if (input) input.focus();
    } else {
      alert(data.message);
    }
  } catch (error) {
    alert("Error al registrar venta: " + error.message);
  }
}

const posMontoInput = document.getElementById("posMontoRecibido");
const posCambio = document.getElementById("posCambio");

if (posMontoInput) {
  posMontoInput.addEventListener("input", () => {
    const metodo = document.getElementById("posMetodoPago").value;

    if (metodo !== "efectivo") return;

    const recibido = limpiarNumero(posMontoInput.value);
    const comision = calcularComision(posVenta.total_con_descuento, metodo);

    const totalFinal = posVenta.total_con_descuento + comision;

    const cambio = recibido - totalFinal;

    if (posCambio) {
      posCambio.textContent = cambio >= 0 ? formatearCOP(cambio) : "0";
    }
  });
}

function calcularComision(total, metodo) {
  const porcentaje = obtenerPorcentajeMetodo(metodo);
  return total * (porcentaje / 100);
}

function obtenerPorcentajeMetodo(metodo) {
  switch (metodo) {
    case "tarjeta":
      return 5;
    case "sistecredito":
      return 4;
    case "addi":
      return 6.5;
    default:
      return 0;
  }
}

const metodoPagoSelect = document.getElementById("posMetodoPago");
const bloqueEfectivo = document.getElementById("bloqueEfectivo");

if (metodoPagoSelect && bloqueEfectivo) {
  metodoPagoSelect.addEventListener("change", () => {
    const metodo = metodoPagoSelect.value;

    if (metodo === "efectivo") {
      bloqueEfectivo.classList.remove("hidden");
    } else {
      bloqueEfectivo.classList.add("hidden");

      // Reset visual
      const montoInput = document.getElementById("posMontoRecibido");
      const posCambio = document.getElementById("posCambio");

      if (montoInput) montoInput.value = "";
      if (posCambio) posCambio.textContent = "0";
    }

    actualizarComision();
  });
}

function actualizarComision() {
  const metodo = document.getElementById("posMetodoPago").value;

  const subtotalBase = posVenta.subtotal; // 🔥 SIN descuento
  const subtotalConDescuento = posVenta.total_con_descuento; // 🔥 CON descuento

  const porcentaje = obtenerPorcentajeMetodo(metodo);
  const comision = calcularComision(subtotalConDescuento, metodo);
  const totalFinal = subtotalConDescuento + comision;

  // ===== ELEMENTOS =====
  const subtotalSpan = document.getElementById("posSubtotal");
  const subtotalConDescSpan = document.getElementById(
    "posSubtotalConDescuento",
  );

  const comisionDetalleContainer = document.getElementById(
    "posComisionDetalleContainer",
  );
  const comisionDetalleSpan = document.getElementById("posComisionDetalle");
  const comisionPorcentajeSpan = document.getElementById(
    "posComisionPorcentaje",
  );

  const comisionPagoContainer = document.getElementById("posComisionContainer");
  const comisionPagoSpan = document.getElementById("posComision");

  const totalSpan = document.getElementById("posTotal");

  // 🔥 ACTUALIZAR SUBTOTAL BASE (NO CAMBIA CON DESCUENTO)
  if (subtotalSpan) {
    subtotalSpan.textContent = formatearCOP(subtotalBase);
  }

  // 🔥 ACTUALIZAR SUBTOTAL CON DESCUENTO
  if (subtotalConDescSpan) {
    subtotalConDescSpan.textContent = formatearCOP(subtotalConDescuento);
  }

  // 🔥 COMISIÓN
  if (porcentaje > 0) {
    if (comisionDetalleContainer) {
      comisionDetalleContainer.classList.remove("hidden");
      comisionDetalleSpan.textContent = formatearCOP(comision);

      if (comisionPorcentajeSpan) {
        comisionPorcentajeSpan.textContent = porcentaje;
      }
    }

    if (comisionPagoContainer) {
      comisionPagoContainer.classList.remove("hidden");
      comisionPagoSpan.textContent = formatearCOP(comision);
    }

    totalSpan.textContent = formatearCOP(totalFinal);
  } else {
    if (comisionDetalleContainer) {
      comisionDetalleContainer.classList.add("hidden");
    }

    if (comisionPorcentajeSpan) {
      comisionPorcentajeSpan.textContent = 0;
    }

    if (comisionPagoContainer) {
      comisionPagoContainer.classList.add("hidden");
    }

    totalSpan.textContent = formatearCOP(subtotalConDescuento);
  }
}

// FUNCION PARA DAR FORMATO DE MONEDA
function formatearCOP(valor) {
  if (!valor && valor !== 0) return "";

  const numero = Number(valor);

  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero);
}

// 🔹 Limpia puntos y devuelve número limpio
function limpiarNumero(valor) {
  return Number(String(valor).replace(/[^\d]/g, ""));
}

// 🔹 Formatea mientras el usuario escribe
function formatearInputMoneda(input) {
  let cursorPos = input.selectionStart;

  let valor = input.value.replace(/\D/g, "");

  if (!valor) {
    input.value = "";
    return;
  }

  let numero = Number(valor);

  input.value = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero);

  // Mantener cursor al final (modo simple estable)
  input.setSelectionRange(input.value.length, input.value.length);
}

// 🔹 Activar autoformato para todos los inputs con clase money-input
document.addEventListener("input", function (e) {
  if (e.target.classList.contains("money-input")) {
    formatearInputMoneda(e.target);
  }
});

document
  .getElementById("posDescuentoGlobal")
  .addEventListener("change", function () {
    posVenta.descuento_global_pct = Number(this.value);
    posRecalcular();
    posRender();
  });

let ultimaVentaData = null;
async function mostrarFactura(idVenta) {
  if (!idVenta) {
    console.error("ID de venta inválido:", idVenta);
    alert("No se pudo obtener el ID de la venta.");
    return;
  }

  const response = await fetch(
    `${SCRIPT_URL}?action=getVentaDetalle&id=${idVenta}`,
  );

  const data = await response.json();

  if (data.status !== "success") {
    alert(data.message);
    return;
  }

  const { venta, items } = data;
  ultimaVentaData = { venta, items };

  const subtotalBase = Number(venta.subtotal || 0);
  const descuentoGlobalPct = Number(venta.descuento_global_pct || 0);
  const comisionValor = Number(venta.comision || 0);
  const totalFinal = Number(venta.total_final || 0);
  const montoRecibido = Number(venta.monto_recibido || 0);
  const cambio = Number(venta.cambio || 0);
  const metodoPago = (venta.metodo_pago || "").toLowerCase();

  const montoDescuentoGlobal = subtotalBase * (descuentoGlobalPct / 100);
  const subtotalConDescuento = subtotalBase - montoDescuentoGlobal;

  let comisionPct = 0;
  if (subtotalConDescuento > 0 && comisionValor > 0) {
    comisionPct = (comisionValor / subtotalConDescuento) * 100;
  }

  const hayDescuento = descuentoGlobalPct > 0;
  const hayComision = comisionValor > 0;

  let html = `
    <h2>Factura #${venta.id_venta}</h2>
    <p><b>Fecha:</b> ${new Date(venta.fecha).toLocaleString()}</p>
    <p><b>Cliente:</b> ${venta.cliente || "Consumidor Final"}</p>
    <p><b>Método de Pago:</b> ${venta.metodo_pago}</p>

    <hr>

    <table style="width:100%; border-collapse:collapse;" border="1">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Código</th>
          <th>Cant</th>
          <th>Precio</th>
          <th>Dcto %</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach((item) => {
    html += `
      <tr>
        <td>${item.nombre_producto || ""}</td>
        <td>${item.codigo_producto || ""}</td>
        <td>${item.cantidad || 0}</td>
        <td>$${formatearCOP(item.precio_unitario || 0)}</td>
        <td>${item.descuento_item_pct || 0}%</td>
        <td>$${formatearCOP(item.subtotal_final || 0)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <hr>
  `;

  // 🔥 CASO ESPECIAL: si no hay descuento ni comisión
  if (!hayDescuento && !hayComision) {
    html += `
      <h3>Total Final: $${formatearCOP(totalFinal)}</h3>
    `;
  } else {
    // Mostrar subtotal si existe algún ajuste
    html += `
      <p><b>Subtotal:</b> $${formatearCOP(subtotalBase)}</p>
    `;

    if (hayDescuento) {
      html += `
        <p><b>Descuento Global:</b> ${descuentoGlobalPct}%</p>
      `;
    }

    if (hayDescuento && hayComision) {
      html += `
        <p><b>Subtotal con descuento:</b> $${formatearCOP(
          subtotalConDescuento,
        )}</p>
      `;
    }

    if (hayComision) {
      html += `
        <p><b>Comisión (${comisionPct.toFixed(2)}%):</b> $${formatearCOP(
          comisionValor,
        )}</p>
      `;
    }

    html += `
      <h3>Total Final: $${formatearCOP(totalFinal)}</h3>
    `;
  }

  // Mostrar recibido y cambio solo si es efectivo
  if (metodoPago === "efectivo") {
    html += `
      <p><b>Recibido:</b> $${formatearCOP(montoRecibido)}</p>
      <p><b>Cambio:</b> $${formatearCOP(cambio)}</p>
    `;
  }

  document.getElementById("facturaContenido").innerHTML = html;
  document.getElementById("facturaModal").classList.remove("hidden");

  console.log("DETALLE FACTURA:", data);
  abrirFactura();
}

function cerrarFactura() {
  document.getElementById("facturaModal").classList.add("hidden");
}

function abrirFactura() {
  document.getElementById("facturaModal").classList.remove("hidden");
}

function imprimirFacturaTermica() {
  if (!ultimaVentaData) {
    alert("No hay datos de factura disponibles.");
    return;
  }

  const contenido = generarHTMLTermico(ultimaVentaData);

  const ventana = window.open("", "PRINT", "height=600,width=400");

  ventana.document.write(contenido);
  ventana.document.close();

  ventana.focus();

  setTimeout(() => {
    ventana.print();
    ventana.close();
  }, 500);
}

function generarHTMLTermico(data) {
  const { venta, items } = data;

  const subtotalBase = Number(venta.subtotal || 0);
  const descuentoGlobalPct = Number(venta.descuento_global_pct || 0);
  const comisionValor = Number(venta.comision || 0);
  const totalFinal = Number(venta.total_final || 0);
  const montoRecibido = Number(venta.monto_recibido || 0);
  const cambio = Number(venta.cambio || 0);
  const metodoPago = (venta.metodo_pago || "").toLowerCase();

  const montoDescuentoGlobal = subtotalBase * (descuentoGlobalPct / 100);
  const subtotalConDescuento = subtotalBase - montoDescuentoGlobal;

  let comisionPct = 0;
  if (subtotalConDescuento > 0 && comisionValor > 0) {
    comisionPct = (comisionValor / subtotalConDescuento) * 100;
  }

  const hayDescuento = descuentoGlobalPct > 0;
  const hayComision = comisionValor > 0;

  let itemsHTML = "";

  items.forEach((item) => {
    const precioUnitario = Number(item.precio_unitario || 0);
    const cantidad = Number(item.cantidad || 0);
    const descuentoItemPct = Number(item.descuento_item_pct || 0);

    // 🔐 Cálculo blindado del subtotal
    const subtotalBruto = cantidad * precioUnitario;
    const montoDescuentoItem = subtotalBruto * (descuentoItemPct / 100);
    const subtotalCalculado = subtotalBruto - montoDescuentoItem;

    const hayDescuentoItem = descuentoItemPct > 0;

    itemsHTML += `
    <div class="item">

      <div class="linea-flex">
        <span><strong>${item.nombre_producto || ""}</strong></span>
        <span>${item.codigo_producto || ""}</span>
      </div>

      <div>Cantidad: ${cantidad}</div>
      <div>Valor unitario: $${formatearCOP(precioUnitario)}</div>

      ${hayDescuentoItem ? `<div>Descuento: ${descuentoItemPct}%</div>` : ""}

      <div>Subtotal: $${formatearCOP(subtotalCalculado)}</div>

    </div>

    <hr>
  `;
  });

  return `
  <html>
    <head>
      <title>Ticket</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }

        body {
          width: 80mm;
          font-family: monospace;
          font-size: 12px;
          margin: 0;
          padding: 5px;
        }

        h2, h3 {
          text-align: center;
          margin: 5px 0;
        }

        .center {
          text-align: center;
        }

        .item {
          margin-bottom: 5px;
        }

        .linea-flex {
          display: flex;
          justify-content: space-between;
        }

        hr {
          border: none;
          border-top: 1px dashed black;
          margin: 5px 0;
        }

        .totales {
          margin-top: 5px;
        }

        .totales div {
          display: flex;
          justify-content: space-between;
        }

        .bold {
          font-weight: bold;
        }
      </style>
    </head>

    <body>

      <h2>GITANAS</h2>
      <div class="center">
        Factura #${venta.id_venta}<br>
        ${new Date(venta.fecha).toLocaleString()}
      </div>

      <hr>

      ${itemsHTML}

      <div class="totales">

        ${
          !hayDescuento && !hayComision
            ? `
          <div class="bold">
            <span>TOTAL</span>
            <span>$${formatearCOP(totalFinal)}</span>
          </div>
        `
            : `
          <div>
            <span>Subtotal</span>
            <span>$${formatearCOP(subtotalBase)}</span>
          </div>

          ${
            hayDescuento
              ? `
          <div>
            <span>Dcto ${descuentoGlobalPct}%</span>
            <span>-$${formatearCOP(montoDescuentoGlobal)}</span>
          </div>
          `
              : ""
          }

          ${
            hayDescuento && hayComision
              ? `
          <div>
            <span>Sub c/dcto</span>
            <span>$${formatearCOP(subtotalConDescuento)}</span>
          </div>
          `
              : ""
          }

          ${
            hayComision
              ? `
          <div>
            <span>Comisión (${comisionPct.toFixed(2)}%)</span>
            <span>$${formatearCOP(comisionValor)}</span>
          </div>
          `
              : ""
          }

          <div class="bold">
            <span>TOTAL</span>
            <span>$${formatearCOP(totalFinal)}</span>
          </div>
        `
        }

      </div>

      ${
        metodoPago === "efectivo"
          ? `
      <hr>
      <div>
        Recibido: $${formatearCOP(montoRecibido)}<br>
        Cambio: $${formatearCOP(cambio)}
      </div>
      `
          : ""
      }

      <hr>

      <div class="center">
        ¡Gracias por su compra!
      </div>

    </body>
  </html>
  `;
}
