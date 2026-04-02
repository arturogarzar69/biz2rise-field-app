export const uiText = {
  metadata: {
    title: "Biz2Rise Field App",
    description: "Acceso y panel operativo de Biz2Rise Field App"
  },
  common: {
    appName: "Biz2Rise Field App",
    loadingDashboard: "Cargando panel...",
    logout: "Cerrar sesion",
    loggingOut: "Cerrando sesion...",
    loggedInAs: "Sesion iniciada como",
    statusLabels: {
      scheduled: "Programada",
      completed: "Completada",
      cancelled: "Cancelada"
    }
  },
  login: {
    title: "Iniciar sesion",
    subtitle: "Accede al panel operativo de Biz2Rise Field App.",
    checkingSession: "Verificando tu sesion...",
    emailLabel: "Correo electronico",
    emailPlaceholder: "tu@empresa.com",
    passwordLabel: "Contrasena",
    passwordPlaceholder: "Ingresa tu contrasena",
    submit: "Ingresar",
    submitting: "Ingresando...",
    invalidCredentials: "Correo o contrasena incorrectos. Intentalo de nuevo.",
    loginFailed:
      "No pudimos iniciar sesion. Verifica tu correo y tu contrasena.",
    networkError:
      "Error de red al conectar con Supabase. Revisa la URL, la clave publica o algun bloqueo del navegador o de la red.",
    missingEnv:
      "Agrega primero la URL de Supabase y la clave anonima en .env.local."
  },
  dashboard: {
    eyebrow: "Panel administrativo",
    calendarTitle: "Calendario de servicios",
    calendarSubtitle: "Vista mensual de visitas y servicios programados.",
    calendarEmptyTitle: "No hay ordenes de servicio todavia",
    calendarEmptyBody:
      "Cuando existan registros en service_orders, apareceran aqui en el calendario.",
    calendarErrorTitle: "No se pudieron cargar las ordenes de servicio",
    calendarErrorBody: "No fue posible cargar las ordenes de servicio desde Supabase.",
    operationsTitle: "Operaciones",
    operationsBody:
      "Espacio reservado para filtros, indicadores y estado operativo del equipo.",
    workspaceTitle: "Espacio de trabajo",
    workspaceBody:
      "Modulos operativos para administrar el servicio sin salir del panel.",
    detailTitle: "Detalle de la orden de servicio",
    detailEmpty:
      "Selecciona una orden de servicio del calendario para ver sus detalles.",
    detailDescription:
      "Actualiza la asignacion y la programacion de la orden seleccionada.",
    detailSave: "Guardar cambios",
    detailSaving: "Guardando cambios...",
    detailSuccess: "Cambios guardados correctamente.",
    detailError: "No fue posible actualizar la orden de servicio.",
    detailTechnicianEmpty:
      "No hay tecnicos activos disponibles para reasignar esta orden.",
    detailFields: {
      clientName: "Cliente",
      branchName: "Sucursal",
      technicianName: "Tecnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      status: "Estado",
      createdAt: "Creada el"
    },
    branchEmpty: "Sin sucursal asignada"
  },
  tabs: {
    newServiceOrder: "Nueva orden de servicio",
    clients: "Clientes",
    technicians: "Tecnicos",
    reports: "Reportes"
  },
  serviceOrder: {
    title: "Nueva orden de servicio",
    description:
      "Crea y asigna una nueva orden de servicio. El campo de notas solo se muestra en la interfaz por ahora y todavia no se guarda en la base de datos.",
    fields: {
      client: "Cliente",
      branch: "Sucursal",
      technician: "Tecnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      status: "Estado",
      notes: "Notas"
    },
    placeholders: {
      client: "Selecciona un cliente",
      branch: "Selecciona una sucursal",
      branchDisabled: "Selecciona una sucursal",
      branchLoading: "Cargando sucursales...",
      technician: "Selecciona un tecnico activo",
      technicianLoading: "Cargando tecnicos...",
      clientLoading: "Cargando clientes...",
      serviceTime: "Selecciona una hora de servicio",
      notes: "Notas internas solo visibles en la interfaz"
    },
    save: "Crear orden de servicio",
    saving: "Guardando orden de servicio...",
    success: "Orden de servicio creada correctamente.",
    createError: "No fue posible crear la orden de servicio.",
    configError: "Supabase no esta configurado correctamente.",
    clientEmpty:
      "No hay clientes disponibles. Primero crea uno en la pestana Clientes.",
    branchEmpty:
      "No hay sucursales disponibles para este cliente. Primero crea una en la seccion Clientes.",
    technicianEmpty:
      "No hay tecnicos activos disponibles. Primero crea uno en la pestana Tecnicos.",
    refreshError:
      "La orden de servicio se creo, pero no fue posible actualizar el calendario.",
    notesHelp: "Notas internas solo visibles en la interfaz",
    timeLabels: {
      am: "a. m.",
      pm: "p. m."
    }
  },
  clients: {
    title: "Clientes",
    description:
      "Administra la informacion comercial de cada cliente y manten sus datos disponibles para ordenes de servicio y programacion.",
    subTabs: {
      list: "Lista de clientes",
      form: "Alta / edicion",
      branches: "Sucursales"
    },
    fields: {
      businessName: "Razon social",
      tradeName: "Nombre comercial",
      taxId: "Identificacion fiscal",
      mainAddress: "Direccion oficina principal",
      mainPhone: "Telefono principal",
      mainContact: "Contacto principal",
      mainEmail: "Email principal"
    },
    placeholders: {
      businessName: "Ingresa la razon social",
      tradeName: "Ingresa el nombre comercial",
      taxId: "Ingresa la identificacion fiscal",
      mainAddress: "Ingresa la direccion principal",
      mainPhone: "Ingresa el telefono principal",
      mainContact: "Ingresa el nombre del contacto principal",
      mainEmail: "Ingresa el email principal"
    },
    save: "Crear cliente",
    update: "Guardar cambios",
    newClient: "Nuevo cliente",
    saving: "Guardando cliente...",
    success: "Cliente creado correctamente.",
    updateSuccess: "Cliente actualizado correctamente.",
    createError: "No fue posible guardar el cliente.",
    configError: "Supabase no esta configurado correctamente.",
    listTitle: "Clientes registrados",
    empty: "Todavia no hay clientes. Crea el primero arriba.",
    headers: {
      name: "Cliente",
      phone: "Telefono",
      contact: "Contacto",
      actions: "Acciones"
    },
    loading: "Cargando clientes...",
    loadError: "No fue posible cargar los clientes.",
    edit: "Editar",
    formCreateTitle: "Nuevo cliente",
    formEditTitle: "Editar cliente",
    formCreateBody:
      "Registra la informacion comercial basica del cliente para dejarla lista para futuras ordenes.",
    formEditBody:
      "Actualiza los datos comerciales del cliente seleccionado sin perder la informacion existente.",
    manageBranches: "Sucursales",
    branchesPanelTitle: "Sucursales del cliente",
    branchesPanelBody:
      "Registra y consulta las sucursales del cliente seleccionado para usarlas en ordenes de servicio.",
    branchesFormCreateTitle: "Nueva sucursal",
    branchesFormEditTitle: "Editar sucursal",
    branchesFormCreateBody:
      "Registra una nueva sucursal para el cliente activo y dejala disponible para futuras ordenes.",
    branchesFormEditBody:
      "Actualiza la informacion operativa de la sucursal seleccionada usando el mismo formulario.",
    branchesEmptyState:
      "Este cliente aun no tiene sucursales registradas. Crea la primera abajo.",
    branchesSelectClient:
      "Selecciona un cliente de la lista para gestionar sus sucursales.",
    branchesSelectedClientLabel: "Cliente activo",
    branchesLoading: "Cargando sucursales...",
    branchesLoadError: "No fue posible cargar las sucursales.",
    branchCreateError: "No fue posible guardar la sucursal.",
    branchCreateSuccess: "Sucursal creada correctamente.",
    branchUpdateSuccess: "Sucursal actualizada correctamente.",
    branchSave: "Crear sucursal",
    branchUpdate: "Guardar cambios",
    branchSaving: "Guardando sucursal...",
    branchNew: "Nueva sucursal",
    branchListTitle: "Sucursales registradas",
    branchSummaryFallback: "Sin datos de contacto",
    branchSelectedSummary: "Sucursal seleccionada",
    branchEdit: "Editar",
    branchFields: {
      name: "Nombre de sucursal",
      address: "Direccion",
      phone: "Telefono",
      contact: "Contacto",
      notes: "Notas"
    },
    branchPlaceholders: {
      name: "Ingresa el nombre de la sucursal",
      address: "Ingresa la direccion de la sucursal",
      phone: "Ingresa el telefono de la sucursal",
      contact: "Ingresa el contacto de la sucursal",
      notes: "Notas operativas de la sucursal"
    },
    branchHeaders: {
      name: "Sucursal",
      address: "Direccion",
      phone: "Telefono",
      contact: "Contacto",
      actions: "Acciones"
    }
  },
  technicians: {
    title: "Tecnicos",
    description:
      "Administra el equipo tecnico y manten una lista actualizada para futuras asignaciones y rutas de trabajo.",
    subTabs: {
      list: "Lista de tecnicos",
      form: "Alta / edicion"
    },
    formCreateTitle: "Nuevo tecnico",
    formEditTitle: "Editar tecnico",
    formCreateBody:
      "Registra un nuevo tecnico para dejarlo disponible en las asignaciones y ordenes de servicio.",
    formEditBody:
      "Actualiza la informacion del tecnico seleccionado usando el mismo formulario operativo.",
    fields: {
      fullName: "Nombre completo",
      phone: "Telefono",
      address: "Direccion",
      notes: "Notas",
      isActive: "Tecnico activo"
    },
    placeholders: {
      fullName: "Ingresa el nombre completo del tecnico",
      phone: "Ingresa el telefono del tecnico",
      address: "Ingresa la direccion del tecnico",
      notes: "Notas operativas del tecnico"
    },
    save: "Crear tecnico",
    update: "Guardar cambios",
    newTechnician: "Nuevo tecnico",
    saving: "Guardando tecnico...",
    success: "Tecnico creado correctamente.",
    updateSuccess: "Tecnico actualizado correctamente.",
    createError: "No fue posible crear el tecnico.",
    configError: "Supabase no esta configurado correctamente.",
    listTitle: "Tecnicos registrados",
    empty: "Todavia no hay tecnicos. Crea el primero arriba.",
    headers: {
      fullName: "Nombre completo",
      phone: "Telefono",
      status: "Estado",
      createdAt: "Creado el"
    },
    loading: "Cargando tecnicos...",
    loadError: "No fue posible cargar los tecnicos.",
    active: "Activo",
    inactive: "Inactivo",
    edit: "Editar",
    schemaWarning:
      "La tabla de tecnicos aun no incluye Telefono, Direccion y Notas. Puedes seguir usando el modulo con el esquema actual.",
    schemaMigrationTitle: "Columnas adicionales pendientes en la base de datos"
  },
  reports: {
    title: "Reportes",
    description:
      "Aqui se mostraran historiales de servicio, resumenes operativos y reportes para seguimiento."
  },
  calendar: {
    messages: {
      today: "Hoy",
      previous: "Anterior",
      next: "Siguiente",
      month: "Mes",
      week: "Semana",
      date: "Fecha",
      time: "Hora",
      event: "Evento",
      allDay: "Todo el dia",
      noEventsInRange: "No hay eventos en este rango."
    }
  }
};

export function getStatusLabel(status) {
  return uiText.common.statusLabels[status] || status;
}

export function formatDisplayTime(timeValue) {
  if (!timeValue) {
    return "";
  }

  const match = timeValue.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return timeValue;
  }

  const suffix = match[2].toUpperCase() === "AM"
    ? uiText.serviceOrder.timeLabels.am
    : uiText.serviceOrder.timeLabels.pm;

  return `${match[1]} ${suffix}`;
}
