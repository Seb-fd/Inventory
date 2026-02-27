// ***************************************************************
// ⚠️ 1. REEMPLAZA ESTE VALOR con el ID real de tu Google Sheet
// ***************************************************************
const SPREADSHEET_ID = "1vl3MbYVqN6E7yyLwzzigwDsF858Gkm_3GQU6alp8_7k";

// Nombres de las pestañas
const HOJA_CATEGORIAS = "Categorias";
const HOJA_PRODUCTOS = "Productos";
const HOJA_COMPRAS = "Compras";
const HOJA_VENTAS = "Ventas";
const HOJA_RESUMEN = "resumen_diario";
const HOJA_VENTAS_DETALLE = "Ventas_Detalle";

// Encabezados
const CATEGORIAS_HEADERS = ["id", "nombre"];
const PRODUCTOS_HEADERS = [
  "id",
  "nombre",
  "código",
  "categoría",
  "precio_compra",
  "precio_venta",
  "precio_venta_2",
  "precio_venta_3",
  "precio_venta_4",
  "stock",
  "fecha_creado",
];

const COMPRAS_HEADERS = [
  "id",
  "producto_id",
  "cantidad",
  "precio_compra",
  "fecha",
  "proveedor",
];

const RESUMEN_HEADERS = [
  "fecha",
  "total_ventas",
  "total_compras",
  "ganancia",
  "productos_vendidos",
];

const VENTAS_POS_HEADERS = [
  "id_venta",
  "fecha",
  "cliente",
  "subtotal",
  "descuento_global_pct",
  "total_final",
  "metodo_pago",
  "comision",
  "monto_recibido",
  "cambio",
];

const VENTAS_DETALLE_HEADERS = [
  "id_detalle",
  "id_venta",
  "producto_id",
  "nombre_producto",
  "codigo_producto",
  "cantidad",
  "precio_unitario",
  "descuento_item_pct",
  "subtotal_original",
  "subtotal_final",
  "metodo_pago",
];

// --- FUNCIÓN CENTRAL PARA ACCEDER A LA HOJA ---
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// 🔑 FUNCIÓN CORREGIDA: Generación de ID Único
function generateUniqueAppId() {
  return (
    "id-" +
    (
      new Date().getTime().toString(36) +
      Math.random().toString(36).substring(2, 9)
    ).toUpperCase()
  );
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES GET
// ----------------------------------------------------------------------
function doGet(e) {
  const action = e.parameter.action;
  const query = e.parameter.query;
  const sheetName = e.parameter.sheetName;
  let result;

  try {
    if (action === "getVentaDetalle") {
      result = getVentaDetalle(e.parameter.id);
    } else if (action === "iniciar" || action === "resetear") {
      result =
        action === "iniciar" ? iniciarBaseDeDatos() : resetearBaseDeDatos();
    } else if (action === "getCategorias") {
      result = getCategorias();
    } else if (action === "buscarProducto") {
      result = buscarProducto(query);
    } else if (action === "getInventario") {
      result = getInventario();
    } else if (action === "getResumenDiario") {
      result = getResumenDiario();
    } else if (action === "getData" && sheetName) {
      result = getData(sheetName);
    } else {
      result = {
        status: "error",
        message: `Acción GET '${action}' no válida o faltan parámetros.`,
      };
    }
  } catch (error) {
    result = {
      status: "error",
      message: `Error en doGet: ${error.message}`,
    };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES POST
// ----------------------------------------------------------------------
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "error",
          message: "No se recibieron datos en la solicitud POST.",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    let result;
    if (action === "agregarCategoria") {
      result = agregarCategoria(requestData);
    } else if (action === "agregarProducto") {
      result = agregarProducto(requestData);
    } else if (action === "registrarTransaccion") {
      result = registrarTransaccion(requestData);
    } else if (action === "registrarVentaPOS") {
      result = registrarVentaPOS(requestData);
    } else {
      result = { status: "error", message: "Acción POST no reconocida." };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
      ContentService.MimeType.JSON,
    );
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: `Error al procesar la solicitud POST: ${error.message}`,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE CATEGORÍAS
// ----------------------------------------------------------------------
function getCategorias() {
  return getData(HOJA_CATEGORIAS);
}

function agregarCategoria(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(HOJA_CATEGORIAS);

  if (!sheet) {
    return {
      status: "error",
      message: `La pestaña '${HOJA_CATEGORIAS}' no existe. Inicie la Base de Datos.`,
    };
  }

  const newId = generateUniqueAppId();

  const newRow = [newId, data.nombre];

  try {
    sheet.appendRow(newRow);
    return {
      status: "success",
      message: `Categoría '${data.nombre}' agregada (ID: ${newId}).`,
    };
  } catch (e) {
    return {
      status: "error",
      message: `Error al escribir categoría: ${e.message}`,
    };
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE PRODUCTOS Y BÚSQUEDA
// ----------------------------------------------------------------------
function getInventario() {
  return getData(HOJA_PRODUCTOS);
}

function buscarProducto(query) {
  const data = getData(HOJA_PRODUCTOS);

  if (data.status !== "success") return data;

  const products = data.data;
  const lowerQuery = query.toLowerCase().trim();

  if (lowerQuery.length === 0) {
    return {
      status: "warning",
      message: "Especifique un ID, Código o Nombre para buscar.",
    };
  }

  // Filtra productos por ID, Código, o Nombre - CONVERSIÓN SEGURA A STRING
  const results = products.filter((p) => {
    // Convertir todos los valores a string de forma segura
    const idStr = String(p.id || "");
    const codigoStr = String(p.código || "");
    const nombreStr = String(p.nombre || "");

    return (
      idStr.toLowerCase().includes(lowerQuery) ||
      codigoStr.toLowerCase().includes(lowerQuery) ||
      nombreStr.toLowerCase().includes(lowerQuery)
    );
  });

  if (results.length > 0) {
    return {
      status: "success",
      data: results,
      message: `${results.length} coincidencias encontradas.`,
    };
  } else {
    return { status: "warning", message: "Producto no encontrado." };
  }
}

function agregarProducto(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(HOJA_PRODUCTOS);

  if (!sheet) {
    return {
      status: "error",
      message: `La pestaña '${HOJA_PRODUCTOS}' no existe. Inicie la Base de Datos.`,
    };
  }

  const newId = generateUniqueAppId();

  const precioVentaBase = parseFloat(data.precio_venta) || 0;

  const precioVenta2 =
    data.precio_venta_2 !== undefined && data.precio_venta_2 !== ""
      ? parseFloat(data.precio_venta_2)
      : precioVentaBase;

  const precioVenta3 =
    data.precio_venta_3 !== undefined && data.precio_venta_3 !== ""
      ? parseFloat(data.precio_venta_3)
      : precioVentaBase;

  const precioVenta4 =
    data.precio_venta_4 !== undefined && data.precio_venta_4 !== ""
      ? parseFloat(data.precio_venta_4)
      : precioVentaBase;

  const newRow = [
    newId,
    data.nombre,
    data.codigo,
    data.categoria,
    parseFloat(data.precio_compra) || 0,
    precioVentaBase,
    precioVenta2,
    precioVenta3,
    precioVenta4,
    parseInt(data.stock) || 0,
    new Date(),
  ];

  try {
    sheet.appendRow(newRow);
    return {
      status: "success",
      message: `Producto '${data.nombre}' registrado con éxito. ID: ${newId}`,
    };
  } catch (e) {
    return {
      status: "error",
      message: `Error al escribir producto: ${e.message}`,
    };
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE TRANSACCIONES (COMPRAS/VENTAS)
// ----------------------------------------------------------------------
function registrarTransaccion(data) {
  const ss = getSpreadsheet();
  const action = data.type; // 'compra' o 'venta'
  const isCompra = action === "compra";
  const sheetName = isCompra ? HOJA_COMPRAS : HOJA_VENTAS;
  const sheet = ss.getSheetByName(sheetName);
  const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);

  if (!sheet || !sheetProductos) {
    return {
      status: "error",
      message: `Una o más pestañas necesarias no existen. Inicie la Base de Datos.`,
    };
  }

  // 1. Validar producto y obtener fila actual
  const { rowData, rowIndex } = findProductRow(
    sheetProductos,
    data.producto_id,
  );

  if (rowIndex === -1) {
    return {
      status: "error",
      message: `Producto ID ${data.producto_id} no encontrado en inventario.`,
    };
  }

  // 2. Obtener datos actuales del producto
  const stockColIndex = 9;
  const precioCompraColIndex = 4;
  const precioVentaColIndex = 5;

  const cantidad = parseInt(data.cantidad);
  const precioTransaccion = parseFloat(data.precio);

  let stockActual = parseFloat(rowData[stockColIndex]) || 0;
  let nuevoStock;

  // 3. Validar stock para ventas
  if (!isCompra) {
    if (stockActual < cantidad) {
      return {
        status: "warning",
        message: `Stock insuficiente. Solo hay ${stockActual} unidades disponibles para la venta de ${cantidad} unidades.`,
      };
    }
    nuevoStock = stockActual - cantidad;
  } else {
    nuevoStock = stockActual + cantidad;
  }

  // 4. Escribir nueva transacción
  const transaccionId = generateUniqueAppId();
  const newRow = [
    transaccionId,
    data.producto_id,
    cantidad,
    precioTransaccion,
    new Date(),
    data.extra_data || "",
  ];

  try {
    sheet.appendRow(newRow);
  } catch (e) {
    return {
      status: "error",
      message: `Error al registrar transacción: ${e.message}`,
    };
  }

  // 5. Actualizar stock del producto
  try {
    sheetProductos
      .getRange(rowIndex + 1, stockColIndex + 1)
      .setValue(nuevoStock);

    // 6. Actualizar precio si es diferente
    if (isCompra) {
      const precioActualCompra = parseFloat(rowData[precioCompraColIndex]) || 0;
      if (precioTransaccion !== precioActualCompra) {
        sheetProductos
          .getRange(rowIndex + 1, precioCompraColIndex + 1)
          .setValue(precioTransaccion);
      }
    } else {
      const precioActualVenta = parseFloat(rowData[precioVentaColIndex]) || 0;
      if (precioTransaccion !== precioActualVenta) {
        sheetProductos
          .getRange(rowIndex + 1, precioVentaColIndex + 1)
          .setValue(precioTransaccion);
      }
    }

    return {
      status: "success",
      message: `${
        isCompra ? "Compra" : "Venta"
      } registrada exitosamente. Stock actualizado: ${nuevoStock} unidades.`,
    };
  } catch (e) {
    // Si falla la actualización, revertir la transacción
    sheet.deleteRow(sheet.getLastRow());
    return {
      status: "error",
      message: `Error al actualizar inventario: ${e.message}`,
    };
  }
}

function registrarVentaPOS(data) {
  const ss = getSpreadsheet();
  const sheetVentas = ss.getSheetByName(HOJA_VENTAS);
  const sheetDetalle = ss.getSheetByName(HOJA_VENTAS_DETALLE);
  const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);
  const metodoPago = data.metodoPago || "efectivo";
  const comision = Number(data.comision) || 0;

  if (!sheetVentas || !sheetDetalle || !sheetProductos) {
    return {
      status: "error",
      message: "Una o más hojas necesarias no existen.",
    };
  }

  const items = data.items;
  const cliente = data.cliente || "Mostrador";
  let montoRecibido = parseFloat(data.montoRecibido) || 0;

  if (!items || items.length === 0) {
    return { status: "warning", message: "No hay productos en la venta." };
  }

  // 1️⃣ Validar stock completo antes de modificar nada
  const productosData = sheetProductos.getDataRange().getValues();
  const headers = productosData[0];

  const idCol = headers.indexOf("id");
  const stockCol = headers.indexOf("stock");

  let subtotalGeneral = 0;
  let updatesStock = [];

  for (let item of items) {
    const productoId = item.producto_id;
    const cantidad = parseInt(item.cantidad);
    const precio = parseFloat(item.precio);

    const rowIndex = productosData.findIndex(
      (row, i) => i > 0 && String(row[idCol]) === String(productoId),
    );

    if (rowIndex === -1) {
      return {
        status: "error",
        message: `Producto ID ${productoId} no encontrado.`,
      };
    }

    const stockActual = parseFloat(productosData[rowIndex][stockCol]) || 0;

    if (stockActual < cantidad) {
      return {
        status: "warning",
        message: `Stock insuficiente para producto ID ${productoId}. Disponible: ${stockActual}`,
      };
    }

    const nuevoStock = stockActual - cantidad;
    updatesStock.push({ rowIndex, nuevoStock });

    const descuentoItemPct = Number(item.descuento_item_pct) || 0;

    const subtotalOriginal = cantidad * precio;
    const descuentoItem = subtotalOriginal * (descuentoItemPct / 100);
    const subtotalFinal = subtotalOriginal - descuentoItem;

    subtotalGeneral += subtotalFinal;
  }

  const descuentoGlobalPct = Number(data.descuento_global_pct) || 0;

  const descuentoGlobal = subtotalGeneral * (descuentoGlobalPct / 100);

  const totalConDescuento = subtotalGeneral - descuentoGlobal;
  const totalFinal = totalConDescuento + comision;

  let cambio = 0;

  if (metodoPago === "efectivo") {
    cambio = montoRecibido - totalFinal;

    if (montoRecibido < totalFinal) {
      return {
        status: "warning",
        message: "El monto recibido es menor al total de la venta.",
      };
    }
  } else {
    // Para tarjeta, transferencia, crédito no hay cambio
    montoRecibido = totalFinal;
    cambio = 0;
  }

  // 2️⃣ Registrar encabezado de venta
  const ventaId = generateUniqueAppId();
  const fecha = new Date();

  try {
    sheetVentas.appendRow([
      ventaId,
      fecha,
      cliente,
      subtotalGeneral,
      descuentoGlobalPct,
      totalFinal,
      metodoPago,
      comision,
      montoRecibido,
      cambio,
    ]);
  } catch (e) {
    return { status: "error", message: "Error al registrar venta." };
  }

  // 3️⃣ Registrar detalle
  try {
    for (let item of items) {
      const detalleId = generateUniqueAppId();
      const descuentoItemPct = Number(item.descuento_item_pct) || 0;

      const subtotalOriginal = item.cantidad * item.precio;
      const descuentoItem = subtotalOriginal * (descuentoItemPct / 100);
      const subtotalFinal = subtotalOriginal - descuentoItem;

      // 🔎 Buscar nombre y código del producto
      const productoRow = productosData.find(
        (r, i) => i > 0 && String(r[idCol]) === String(item.producto_id),
      );

      const nombreProducto = productoRow ? productoRow[1] : "";
      const codigoProducto = productoRow ? productoRow[2] : "";

      sheetDetalle.appendRow([
        detalleId,
        ventaId,
        item.producto_id,
        nombreProducto,
        codigoProducto,
        item.cantidad,
        item.precio,
        descuentoItemPct,
        subtotalOriginal,
        subtotalFinal,
        metodoPago,
      ]);
    }
  } catch (e) {
    sheetVentas.deleteRow(sheetVentas.getLastRow());
    return { status: "error", message: "Error al registrar detalle." };
  }

  // 4️⃣ Actualizar stocks
  try {
    for (let update of updatesStock) {
      sheetProductos
        .getRange(update.rowIndex + 1, stockCol + 1)
        .setValue(update.nuevoStock);
    }

    actualizarResumenDiario(totalFinal, items, comision, descuentoGlobalPct);
  } catch (e) {
    return { status: "error", message: "Error al actualizar stock." };
  }

  return {
    status: "success",
    message: "Venta registrada correctamente.",
    total: totalFinal,
    cambio: cambio,
    ventaId: ventaId,
  };
}

function actualizarResumenDiario(
  totalFinal,
  items,
  comision,
  descuentoGlobalPct,
) {
  const ss = getSpreadsheet();
  const sheetResumen = ss.getSheetByName(HOJA_RESUMEN);
  const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const data = sheetResumen.getDataRange().getValues();
  const headers = data[0];

  const fechaCol = headers.indexOf("fecha");
  const ventasCol = headers.indexOf("total_ventas");
  const comprasCol = headers.indexOf("total_compras");
  const gananciaCol = headers.indexOf("ganancia");
  const productosVendidosCol = headers.indexOf("productos_vendidos");

  let rowIndex = -1;

  // Buscar si ya existe fila para hoy
  for (let i = 1; i < data.length; i++) {
    let fechaFila = new Date(data[i][fechaCol]);
    fechaFila.setHours(0, 0, 0, 0);
    if (fechaFila.getTime() === hoy.getTime()) {
      rowIndex = i;
      break;
    }
  }

  // Calcular ganancia real
  const productosData = sheetProductos.getDataRange().getValues();
  const idCol = productosData[0].indexOf("id");
  const precioCompraCol = productosData[0].indexOf("precio_compra");

  let gananciaTotal = 0;
  let totalProductosVendidos = 0;
  let costoTotal = 0;

  for (let item of items) {
    const productoRow = productosData.find(
      (r) => String(r[idCol]) === String(item.producto_id),
    );
    if (productoRow) {
      const costo = parseFloat(productoRow[precioCompraCol]) || 0;
      const descuentoItemPct = Number(item.descuento_item_pct) || 0;

      const subtotalOriginal = item.precio * item.cantidad;
      const descuentoItem = subtotalOriginal * (descuentoItemPct / 100);
      const subtotalFinal = subtotalOriginal - descuentoItem;

      costoTotal += costo * item.cantidad;
      gananciaTotal += subtotalFinal;

      totalProductosVendidos += item.cantidad;
    }
  }

  gananciaTotal = gananciaTotal - costoTotal - (parseFloat(comision) || 0);

  if (rowIndex === -1) {
    // Crear nueva fila
    sheetResumen.appendRow([
      hoy,
      totalFinal,
      0,
      gananciaTotal,
      totalProductosVendidos,
    ]);
  } else {
    // Actualizar existente
    sheetResumen
      .getRange(rowIndex + 1, ventasCol + 1)
      .setValue(data[rowIndex][ventasCol] + totalFinal);

    sheetResumen
      .getRange(rowIndex + 1, gananciaCol + 1)
      .setValue(data[rowIndex][gananciaCol] + gananciaTotal);

    sheetResumen
      .getRange(rowIndex + 1, productosVendidosCol + 1)
      .setValue(data[rowIndex][productosVendidosCol] + totalProductosVendidos);
  }
}

// ----------------------------------------------------------------------
// FUNCIÓN PARA OBTENER RESUMEN DIARIO
// ----------------------------------------------------------------------
function getResumenDiario() {
  return getData(HOJA_RESUMEN);
}

// ----------------------------------------------------------------------
// FUNCIONES DE UTILIDAD GENERAL
// ----------------------------------------------------------------------
function getData(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      status: "error",
      message: `Pestaña '${sheetName}' vacía o no existe.`,
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const mappedData = rows.map((row) => {
    let entry = {};
    headers.forEach((header, index) => {
      let value = row[index];

      // Manejar valores vacíos
      if (value === "" || value === null || value === undefined) {
        value = "";
      }
      // Si es número, mantenerlo como número
      else if (typeof value === "number") {
        value = value;
      }
      // Si es string que representa número, convertirlo a número
      else if (
        typeof value === "string" &&
        !isNaN(value) &&
        value.trim() !== ""
      ) {
        // Para códigos, mantener como string si tiene letras
        if (header === "código" && /[a-zA-Z]/.test(value)) {
          value = value; // Mantener como string
        } else {
          value = parseFloat(value);
        }
      }
      // Si es fecha, dejarla como está
      else if (value instanceof Date) {
        // Mantener como Date
      }
      // Para cualquier otro caso, asegurar que sea string
      else {
        value = String(value);
      }

      entry[header] = value;
    });
    return entry;
  });

  // Filtrar filas completamente vacías
  const filteredData = mappedData.filter((entry) => {
    return Object.values(entry).some((value) => value !== "" && value !== null);
  });

  return { status: "success", data: filteredData };
}

function findProductRow(sheetProductos, productoId) {
  try {
    const data = sheetProductos.getDataRange().getValues();
    const idColIndex = 0;

    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][idColIndex] || "");
      const searchId = String(productoId || "");

      if (rowId.toLowerCase() === searchId.toLowerCase()) {
        return { rowData: data[i], rowIndex: i };
      }
    }
    return { rowData: null, rowIndex: -1 };
  } catch (error) {
    console.error(`Error en findProductRow: ${error}`);
    return { rowData: null, rowIndex: -1 };
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE CONFIGURACIÓN DE BASE DE DATOS
// ----------------------------------------------------------------------
function createOrResetSheet(ss, name, headers) {
  const existingSheet = ss.getSheetByName(name);

  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }

  const sheet = ss.insertSheet(name);

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  return `Pestaña '${name}' creada o reiniciada correctamente.`;
}

function iniciarBaseDeDatos() {
  const ss = getSpreadsheet();
  let msg = [];

  msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_POS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_VENTAS_DETALLE, VENTAS_DETALLE_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));

  return {
    status: "success",
    message: `Base de datos inicializada: ${msg.join(" ")}`,
  };
}

function resetearBaseDeDatos() {
  const ss = getSpreadsheet();
  let msg = [];

  ss.getSheets().forEach((sheet) => {
    if (sheet.getName() !== "Hoja 1") {
      ss.deleteSheet(sheet);
      msg.push(`Pestaña '${sheet.getName()}' eliminada.`);
    }
  });

  msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_POS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_VENTAS_DETALLE, VENTAS_DETALLE_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));

  return {
    status: "success",
    message: `Base de datos reseteada completamente: ${msg.join(" ")}`,
  };
}

function getVentaDetalle(idVenta) {
  const ss = getSpreadsheet();

  const sheetVentas = ss.getSheetByName(HOJA_VENTAS);
  const sheetDetalle = ss.getSheetByName(HOJA_VENTAS_DETALLE);

  if (!sheetVentas || !sheetDetalle) {
    return {
      status: "error",
      message: "No se encontraron las hojas necesarias.",
    };
  }

  const ventasData = sheetVentas.getDataRange().getValues();
  const detalleData = sheetDetalle.getDataRange().getValues();

  if (ventasData.length < 2) {
    return {
      status: "error",
      message: "No hay ventas registradas.",
    };
  }

  const headersVentas = ventasData[0];
  const headersDetalle = detalleData[0];

  const ventaRow = ventasData.find(
    (row, i) => i > 0 && String(row[0]) === String(idVenta),
  );

  if (!ventaRow) {
    return {
      status: "error",
      message: "Venta no encontrada.",
    };
  }

  const venta = {};
  headersVentas.forEach((h, i) => (venta[h] = ventaRow[i]));

  const items = detalleData
    .filter(
      (row, i) => i > 0 && String(row[1]) === String(idVenta), // 👈 CORREGIDO
    )
    .map((row) => {
      const obj = {};
      headersDetalle.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });

  return {
    status: "success",
    venta: venta,
    items: items,
  };
}
