export const uiText = {
  metadata: {
    title: "Biz2Rise Field App",
    description: "Acceso y panel operativo de Biz2Rise Field App"
  },
  common: {
    appName: "Biz2Rise Field App",
    loadingDashboard: "Cargando panel...",
    cancel: "Cancelar",
    logout: "Cerrar sesion",
    loggingOut: "Cerrando sesion...",
    loggedInAs: "Sesion iniciada como",
    statusLabels: {
      scheduled: "Programada",
      completed: "Completada",
      cancelled: "Cancelada"
    },
    executionStatusLabels: {
      pending: "Pendiente",
      in_progress: "En progreso",
      completed: "Completado"
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
    topTabs: {
      calendar: "Calendario",
      clients: "Clientes",
      technicians: "Tecnicos",
      settings: "Settings"
    },
    profileMissing:
      "No se encontro un perfil asociado a este usuario. Verifica la tabla profiles en Supabase.",
    profileLoadError:
      "No fue posible cargar el perfil del usuario autenticado desde Supabase.",
    companyDebugLabel: "Empresa activa (debug)",
    calendarTitle: "Calendario de servicios",
    calendarSubtitle:
      "Organiza visitas y servicios con una vista operativa de corto plazo, semanal o mensual segun la necesidad del despacho.",
    calendarFilterLabel: "Tecnico",
    calendarFilterAll: "Todos",
    calendarLegendTitle: "Tecnicos",
    calendarTechnicianFallback: "Sin técnico asignado",
    overdueLabel: "Pendiente de reagendar",
    overdueCounterLabel: "Pendientes de reagendar",
    backlogTitle: "Pendientes",
    backlogBody: "Servicios vencidos listos para volver a programarse.",
    backlogEmpty: "No hay servicios pendientes en este momento.",
    operationalInboxEmpty: "No hay servicios ni citas pendientes en este momento.",
    pastAppointmentsLabel: "Citas pasadas sin convertir",
    pastAppointmentsBody: "Citas planeadas que ya pasaron y todavia requieren una decision operativa.",
    pastAppointmentsActionOpen: "Abrir cita",
    backlogActionToday: "Enviar a hoy",
    backlogActionTomorrow: "Enviar a manana",
    backlogActionComplete: "Completar",
    calendarEmptyTitle: "No hay ordenes de servicio todavia",
    calendarEmptyBody:
      "Cuando existan registros en service_orders, apareceran aqui en el calendario.",
    calendarErrorTitle: "No se pudieron cargar las ordenes de servicio",
    calendarErrorBody: "No fue posible cargar las ordenes de servicio desde Supabase.",
    calendarMoveError: "No fue posible reprogramar la orden de servicio.",
    calendarResizeError: "No fue posible actualizar la duracion de la orden de servicio.",
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
    detailOverdueBody:
      "Esta orden ya vencio y necesita una nueva fecha u hora para volver a programarse.",
    detailSave: "Guardar cambios",
    detailSaving: "Guardando cambios...",
    detailReschedule: "Reagendar",
    detailSuccess: "Cambios guardados correctamente.",
    detailError: "No fue posible actualizar la orden de servicio.",
    detailDelete: "Eliminar orden",
    detailDeleteConfirmTitle:
      "¿Estas seguro de que deseas eliminar esta orden de servicio?",
    detailDeleteConfirm: "Confirmar eliminacion",
    detailDeleteCancel: "Cancelar",
    detailDeleteSuccess: "Orden de servicio eliminada correctamente.",
    detailDeleteError: "No fue posible eliminar la orden de servicio.",
    detailTechnicianEmpty:
      "No hay tecnicos activos disponibles para reasignar esta orden.",
    detailFields: {
      clientName: "Cliente",
      branchName: "Ubicacion",
      technicianName: "Tecnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      status: "Estado",
      createdAt: "Creada el"
    },
    branchEmpty: "Sin ubicacion asignada",
    clientsPanelTitle: "Lista de clientes",
    clientsPanelBody: "Vista administrativa de clientes. Aqui expandiremos la gestion comercial.",
    techniciansPanelTitle: "Lista de tecnicos",
    techniciansPanelBody: "Vista administrativa del equipo tecnico y su disponibilidad.",
    settingsPanelTitle: "Configuracion",
    settingsPanelBody: "Panel reservado para empresa, preferencias y configuraciones operativas.",
    companySettingsHelp: "Pega la URL del logo que quieres mostrar en el sistema.",
    companySettingsSave: "Guardar empresa",
    companySettingsSaving: "Guardando empresa...",
    companySettingsSaveSuccess: "Empresa actualizada correctamente.",
    companySettingsSaveError: "No fue posible guardar la configuracion de la empresa.",
    companySettingsLoadError: "No fue posible cargar la empresa activa.",
    companySettingsFields: {
      name: "Nombre de la empresa",
      businessName: "Razon social",
      taxId: "Identificacion fiscal / RFC",
      mainPhone: "Telefono principal",
      mainEmail: "Email principal",
      mainContact: "Contacto principal",
      addressLine1: "Calle y numero",
      addressLine2: "Colonia / Fracc. / Linea 2",
      city: "Ciudad",
      state: "Estado",
      postalCode: "Codigo postal",
      country: "Pais",
      logoUrl: "Logo URL"
    },
    settingsNav: {
      company: "Empresa",
      preferences: "Preferencias",
      notifications: "Notificaciones"
    },
    clientTypeAll: "Todos los tipos",
    technicianStatusAll: "Todos",
    technicianStatusActive: "Activos",
    technicianStatusInactive: "Inactivos"
  },
  serviceList: {
    tabs: {
      calendar: "Calendario",
      list: "Lista"
    },
    title: "Lista de servicios",
    subtitle:
      "Consulta todas las ordenes de servicio en formato tabla y filtra rapidamente por cliente, tecnico o recurrencia.",
    emptyTitle: "No hay servicios para mostrar",
    emptyBody:
      "Ajusta los filtros o crea nuevas ordenes de servicio para ver registros en esta lista.",
    recurringBadge: "Recurrente",
    recurringYes: "Si",
    recurringNo: "No",
    filters: {
      client: "Cliente",
      technician: "Tecnico",
      recurring: "Recurrente",
      all: "Todos"
    },
    placeholders: {
      clientSearch: "Buscar cliente"
    },
    headers: {
      date: "Fecha",
      time: "Hora",
      client: "Cliente",
      branch: "Ubicacion",
      technician: "Tecnico",
      status: "Estado",
      recurring: "Recurrente",
      frequency: "Frecuencia",
      duration: "Duracion"
    }
  },
  technicianDashboard: {
    eyebrow: "Panel tecnico",
    headerTitle: "Panel del tecnico",
    title: "Mis servicios de hoy",
    subtitle:
      "Consulta tus servicios asignados de hoy, inicia la visita y completa el servicio con un reporte breve.",
    assignedTo: "Tecnico asignado",
    selectedService: "Servicio seleccionado",
    empty: "No tienes servicios asignados para hoy.",
    loadError: "No fue posible cargar tus servicios de hoy.",
    completionError: "No fue posible marcar el servicio como completado.",
    completionSuccess: "Servicio marcado como completado.",
    startError: "No fue posible iniciar el servicio.",
    startSuccess: "Servicio iniciado correctamente.",
    detailTitle: "Detalle del servicio",
    detailEmpty: "Selecciona un servicio para ver sus detalles.",
    actions: {
      viewDetail: "Ver detalle",
      start: "Iniciar servicio",
      starting: "Iniciando servicio...",
      complete: "Marcar como completado",
      completing: "Marcando como completado..."
    },
    fields: {
      client: "Cliente",
      branch: "Ubicacion",
      address: "Direccion",
      phone: "Telefono",
      contact: "Contacto",
      serviceTime: "Hora de servicio",
      status: "Estado",
      executionStatus: "Ejecucion",
      startedAt: "Iniciado el",
      completedAt: "Completado el",
      instructions: "Instrucciones de servicio",
      report: "Reporte del servicio"
    },
    fallbacks: {
      branch: "Sin ubicacion",
      address: "Sin direccion registrada",
      phone: "Sin telefono registrado",
      contact: "Sin contacto registrado",
      notes: "Sin notas",
      instructions: "Sin instrucciones registradas",
      report: "Sin reporte registrado"
    },
    helpers: {
      report:
        "Describe brevemente lo realizado, observaciones o hallazgos relevantes antes de completar."
    }
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
      "Crea y asigna una nueva orden de servicio con la informacion operativa esencial. La recurrencia solo guarda la configuracion; las visitas futuras aun no se generan automaticamente.",
    fields: {
      client: "Cliente",
      branch: "Ubicacion guardada",
      locationType: "Ubicacion del servicio",
      savedLocation: "Ubicacion guardada",
      oneOffLocation: "Ubicacion unica para esta visita",
      useOneOffLocation: "Usar ubicacion unica para esta visita",
      oneOffLocationName: "Nombre de la ubicacion",
      oneOffLocationAddress: "Direccion de la visita",
      oneOffLocationPhone: "Telefono en sitio",
      oneOffLocationContact: "Contacto en sitio",
      technician: "Tecnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      duration: "Duracion",
      isRecurring: "Repetir servicio",
      recurrenceType: "Frecuencia",
      recurrenceEndDate: "Hasta que fecha aplicar",
      serviceInstructions: "Instrucciones de servicio",
      serviceReport: "Reporte del servicio",
      status: "Estado",
      notes: "Notas"
    },
    placeholders: {
      client: "Selecciona un cliente",
      branch: "Selecciona una ubicacion guardada",
      branchDisabled: "Selecciona una ubicacion guardada",
      branchLoading: "Cargando ubicaciones guardadas...",
      technician: "Selecciona un tecnico activo",
      technicianLoading: "Cargando tecnicos...",
      clientLoading: "Cargando clientes...",
      oneOffLocationName: "Ej. Casa de la mama, Patio norte, Taller auxiliar",
      oneOffLocationAddress: "Ingresa la direccion exacta de esta visita",
      oneOffLocationPhone: "Telefono opcional para esta visita",
      oneOffLocationContact: "Contacto opcional para esta visita",
      serviceTime: "Selecciona una hora de servicio",
      duration: "Selecciona una duracion",
      recurrenceType: "Selecciona una frecuencia",
      serviceInstructions: "Describe brevemente que debe hacer el tecnico en esta visita...",
      serviceReport: "Describe brevemente lo que se hizo, observaciones o hallazgos relevantes...",
      notes: "Notas internas solo visibles en la interfaz"
    },
    recurrenceOptions: {
      daily: "Diario",
      weekly: "Semanal",
      biweekly: "Quincenal",
      monthly: "Mensual"
    },
    save: "Crear orden de servicio",
    saving: "Guardando orden de servicio...",
    success: "Orden de servicio creada correctamente.",
    createError: "No fue posible crear la orden de servicio.",
    configError: "Supabase no esta configurado correctamente.",
    clientEmpty:
      "No hay clientes disponibles. Primero crea uno en la pestana Clientes.",
    branchEmpty:
      "No hay ubicaciones guardadas disponibles para este cliente. Primero crea una en la seccion Clientes.",
    residentialBranchAuto:
      "Para clientes residenciales se usara automaticamente la ubicacion principal guardada.",
    residentialBranchMissing:
      "No fue posible resolver una ubicacion principal guardada para este cliente residencial.",
    oneOffLocationDescription:
      "Usa esta opcion cuando la visita ocurra en una direccion especifica que no quieres guardar como ubicacion permanente del cliente.",
    oneOffLocationHint:
      "La orden mostrara esta ubicacion primero. Si dejas algun dato vacio, se completara con la ubicacion guardada cuando exista.",
    oneOffLocationRequired:
      "Ingresa al menos la direccion de la ubicacion unica para esta visita.",
    technicianEmpty:
      "No hay tecnicos activos disponibles. Primero crea uno en la pestana Tecnicos.",
    refreshError:
      "La orden de servicio se creo, pero no fue posible actualizar el calendario.",
    technicianConflict:
      "El tecnico seleccionado ya tiene un servicio programado en ese horario.",
    quickCreate: {
      title: "Programar servicio",
      description:
        "Crea una orden de servicio rapidamente desde el calendario sin salir de esta vista.",
      fields: {
        clientName: "Nombre",
        phone: "Telefono",
        address: "Direccion"
      },
      newClient: "+ Nuevo cliente",
      newBranch: "+ Nueva sucursal",
      inlineClientTitle: "Nuevo cliente rapido",
      inlineClientDescription:
        "Registra un cliente minimo y vuelve de inmediato a la orden de servicio.",
      inlineBranchTitle: "Nueva sucursal rapida",
      inlineBranchDescription:
        "Registra una ubicacion guardada minima para el cliente seleccionado y vuelve a la orden.",
      backToOrder: "Volver a la orden",
      createClient: "Crear cliente",
      creatingClient: "Creando cliente...",
      clientCreateError: "No fue posible crear el cliente rapido.",
      createBranch: "Crear sucursal",
      creatingBranch: "Creando sucursal...",
      branchCreateError: "No fue posible crear la sucursal rapida.",
      cancel: "Cancelar",
      save: "Crear servicio",
      saving: "Creando servicio..."
    },
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
    moduleTabs: {
      summary: "Resumen",
      list: "Lista de clientes"
    },
    subTabs: {
      list: "Lista de clientes",
      form: "Alta / edicion",
      branches: "Sucursales"
    },
    fields: {
      clientType: "Tipo de cliente",
      businessName: "Razon social",
      tradeName: "Nombre comercial",
      taxId: "Identificacion fiscal",
      mainAddress: "Direccion oficina principal",
      mainPhone: "Telefono principal",
      mainContact: "Contacto principal",
      mainEmail: "Email principal"
    },
    placeholders: {
      clientType: "Selecciona el tipo de cliente",
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
      type: "Tipo",
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
    },
    typeOptions: {
      residential: "Residencial",
      commercial: "Comercial",
      undefined: "Sin definir"
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
      operational: "Operativo",
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

export function getExecutionStatusLabel(status) {
  return uiText.common.executionStatusLabels[status] || status;
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
