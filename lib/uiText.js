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
      technicians: "Técnicos",
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
    calendarLegendTitle: "Técnicos",
    calendarTechnicianFallback: "Sin técnico asignado",
    overdueLabel: "Pendiente de reagendar",
    overdueCounterLabel: "Pendientes de reagendar",
    backlogTitle: "Pendientes",
    backlogBody: "Servicios vencidos listos para volver a programarse.",
    backlogEmpty: "No hay servicios pendientes en este momento.",
    operationalInboxEmpty: "No hay servicios ni citas pendientes en este momento.",
    pastAppointmentsLabel: "Citas pendientes de resolver",
    pastAppointmentsBody:
      "Estas citas ya quedaron en el pasado. Convierte, reprograma o cancela para mantener limpio el calendario.",
    pastAppointmentsActionOpen: "Abrir cita",
    backlogActionToday: "Enviar a hoy",
    backlogActionTomorrow: "Enviar a manana",
    backlogActionComplete: "Completar",
    calendarEmptyTitle: "No hay órdenes de servicio todavía",
    calendarEmptyBody:
      "Cuando existan registros en service_orders, apareceran aqui en el calendario.",
    calendarErrorTitle: "No se pudieron cargar las órdenes de servicio",
    calendarErrorBody: "No fue posible cargar las órdenes de servicio desde Supabase.",
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
      "Actualiza la asignación y la programación de la orden seleccionada.",
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
    detailDeleteConfirm: "Confirmar eliminación",
    detailDeleteCancel: "Cancelar",
    detailDeleteSuccess: "Orden de servicio eliminada correctamente.",
    detailDeleteError: "No fue posible eliminar la orden de servicio.",
    detailTechnicianEmpty:
      "No hay técnicos activos disponibles para reasignar esta orden.",
    detailFields: {
      clientName: "Cliente",
      branchName: "Ubicación",
      technicianName: "Técnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      status: "Estado",
      createdAt: "Creada el"
    },
    branchEmpty: "Sin ubicación asignada",
    clientsPanelTitle: "Lista de clientes",
    clientsPanelBody: "Vista administrativa de clientes. Aqui expandiremos la gestion comercial.",
    techniciansPanelTitle: "Lista de técnicos",
    techniciansPanelBody: "Vista administrativa del equipo técnico y su disponibilidad.",
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
      businessName: "Razón social",
      taxId: "Identificación fiscal / RFC",
      mainPhone: "Teléfono principal",
      mainEmail: "Email principal",
      mainContact: "Contacto principal",
      addressLine1: "Calle y número",
      addressLine2: "Colonia / Fracc. / Linea 2",
      city: "Ciudad",
      state: "Estado",
      postalCode: "Código postal",
      country: "País",
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
      "Consulta todas las órdenes de servicio en formato tabla y filtra rápidamente por cliente, técnico o recurrencia.",
    emptyTitle: "No hay servicios para mostrar",
    emptyBody:
      "Ajusta los filtros o crea nuevas órdenes de servicio para ver registros en esta lista.",
    recurringBadge: "Recurrente",
    recurringYes: "Si",
    recurringNo: "No",
    filters: {
      client: "Cliente",
      technician: "Técnico",
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
      branch: "Ubicación",
      technician: "Técnico",
      status: "Estado",
      recurring: "Recurrente",
      frequency: "Frecuencia",
      duration: "Duración"
    }
  },
  technicianDashboard: {
    eyebrow: "Panel técnico",
    headerTitle: "Panel del técnico",
    title: "Mis servicios de hoy",
    subtitle:
      "Consulta tus servicios asignados de hoy, inicia la visita y completa el servicio con un reporte breve.",
    assignedTo: "Técnico asignado",
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
      branch: "Ubicación",
      address: "Dirección",
      phone: "Teléfono",
      contact: "Contacto",
      serviceTime: "Hora de servicio",
      status: "Estado",
      executionStatus: "Ejecución",
      startedAt: "Iniciado el",
      completedAt: "Completado el",
      instructions: "Instrucciones de servicio",
      report: "Reporte del servicio"
    },
    fallbacks: {
      branch: "Sin ubicación",
      address: "Sin dirección registrada",
      phone: "Sin teléfono registrado",
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
    technicians: "Técnicos",
    reports: "Reportes"
  },
  serviceOrder: {
    title: "Nueva orden de servicio",
    description:
      "Crea y asigna una nueva orden de servicio con la información operativa esencial. La recurrencia solo guarda la configuración; las visitas futuras aún no se generan automáticamente.",
    fields: {
      client: "Cliente",
      branch: "Ubicación guardada",
      locationType: "Ubicación del servicio",
      savedLocation: "Ubicación guardada",
      oneOffLocation: "Ubicación única para esta visita",
      useOneOffLocation: "Usar ubicación única para esta visita",
      oneOffLocationName: "Nombre de la ubicación",
      oneOffLocationAddress: "Dirección de la visita",
      oneOffLocationPhone: "Teléfono en sitio",
      oneOffLocationContact: "Contacto en sitio",
      technician: "Técnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      duration: "Duración",
      isRecurring: "Repetir servicio",
      recurrenceType: "Frecuencia",
      recurrenceEndDate: "Hasta qué fecha aplicar",
      serviceInstructions: "Instrucciones de servicio",
      serviceReport: "Reporte del servicio",
      status: "Estado",
      notes: "Notas"
    },
    placeholders: {
      client: "Selecciona un cliente",
      branch: "Selecciona una ubicación guardada",
      branchDisabled: "Selecciona una ubicación guardada",
      branchLoading: "Cargando ubicaciones guardadas...",
      technician: "Selecciona un técnico activo",
      technicianLoading: "Cargando técnicos...",
      clientLoading: "Cargando clientes...",
      oneOffLocationName: "Ej. Casa de la mama, Patio norte, Taller auxiliar",
      oneOffLocationAddress: "Ingresa la dirección exacta de esta visita",
      oneOffLocationPhone: "Teléfono opcional para esta visita",
      oneOffLocationContact: "Contacto opcional para esta visita",
      serviceTime: "Selecciona una hora de servicio",
      duration: "Selecciona una duración",
      recurrenceType: "Selecciona una frecuencia",
      serviceInstructions: "Describe brevemente qué debe hacer el técnico en esta visita...",
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
      "No hay clientes disponibles. Primero crea uno en la pestaña Clientes.",
    branchEmpty:
      "No hay ubicaciones guardadas disponibles para este cliente. Primero crea una en la sección Clientes.",
    residentialBranchAuto:
      "Para clientes residenciales se usará automáticamente la ubicación principal guardada.",
    residentialBranchMissing:
      "No fue posible resolver una ubicación principal guardada para este cliente residencial.",
    oneOffLocationDescription:
      "Usa esta opción cuando la visita ocurra en una dirección específica que no quieres guardar como ubicación permanente del cliente.",
    oneOffLocationHint:
      "La orden mostrará esta ubicación primero. Si dejas algún dato vacío, se completará con la ubicación guardada cuando exista.",
    oneOffLocationRequired:
      "Ingresa al menos la dirección de la ubicación única para esta visita.",
    technicianEmpty:
      "No hay técnicos activos disponibles. Primero crea uno en la pestaña Técnicos.",
    refreshError:
      "La orden de servicio se creó, pero no fue posible actualizar el calendario.",
    technicianConflict:
      "El técnico seleccionado ya tiene un servicio programado en ese horario.",
    quickCreate: {
      title: "Programar servicio",
      description:
        "Crea una orden de servicio rápidamente desde el calendario sin salir de esta vista.",
      fields: {
        clientName: "Nombre",
        phone: "Teléfono",
        address: "Dirección"
      },
      newClient: "+ Nuevo cliente",
      newBranch: "+ Nueva dirección",
      inlineClientTitle: "Nuevo cliente rápido",
      inlineClientDescription:
        "Registra un cliente mínimo y vuelve de inmediato a la orden de servicio.",
      inlineBranchTitle: "Nueva dirección rápida",
      inlineBranchDescription:
        "Registra una ubicación guardada mínima para el cliente seleccionado y vuelve a la orden.",
      backToOrder: "Volver a la orden",
      createClient: "Crear cliente",
      creatingClient: "Creando cliente...",
      clientCreateError: "No fue posible crear el cliente rápido.",
      createBranch: "Crear dirección",
      creatingBranch: "Creando dirección...",
      branchCreateError: "No fue posible crear la dirección rápida.",
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
      "Administra cada cliente y sus direcciones de servicio para mantener la programación y la operación siempre listas.",
    moduleTabs: {
      summary: "Resumen",
      list: "Lista de clientes"
    },
    subTabs: {
      list: "Lista de clientes",
      form: "Alta / edición",
      branches: "Direcciones"
    },
    fields: {
      clientType: "Tipo interno",
      name: "Nombre del cliente",
      businessName: "Razón social",
      tradeName: "Nombre comercial",
      taxId: "Identificación fiscal",
      mainAddress: "Dirección principal",
      mainPhone: "Teléfono principal",
      mainContact: "Contacto adicional",
      mainEmail: "Email"
    },
    placeholders: {
      clientType: "Se guarda internamente sin mostrarse en el flujo base",
      name: "Ingresa el nombre del cliente",
      businessName: "Ingresa la razón social",
      tradeName: "Ingresa el nombre comercial",
      taxId: "Ingresa la identificación fiscal",
      mainAddress: "Ingresa la dirección principal",
      mainPhone: "Ingresa el teléfono principal",
      mainContact: "Ingresa un contacto adicional",
      mainEmail: "Ingresa el email"
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
    empty: "Todavía no hay clientes. Crea el primero arriba.",
    headers: {
      name: "Cliente",
      type: "Tipo",
      phone: "Teléfono",
      contact: "Contacto",
      actions: "Acciones"
    },
    loading: "Cargando clientes...",
    loadError: "No fue posible cargar los clientes.",
    edit: "Editar",
    formCreateTitle: "Nuevo cliente",
    formEditTitle: "Editar cliente",
    formCreateBody:
      "Empieza con nombre y teléfono. Agrega dirección y datos opcionales solo cuando hagan falta.",
    formEditBody:
      "Actualiza los datos esenciales del cliente y agrega solo la información adicional que realmente necesites.",
    manageBranches: "Direcciones",
    branchesPanelTitle: "Direcciones del cliente",
    branchesPanelBody:
      "Registra y consulta las direcciones del cliente seleccionado para usarlas en órdenes de servicio y citas.",
    branchesFormCreateTitle: "Nueva dirección",
    branchesFormEditTitle: "Editar dirección",
    branchesFormCreateBody:
      "Registra una nueva dirección para el cliente activo y déjala disponible para futuras órdenes.",
    branchesFormEditBody:
      "Actualiza la información operativa de la dirección seleccionada usando el mismo formulario.",
    branchesEmptyState:
      "Este cliente aún no tiene direcciones registradas. Agrega la primera cuando la necesites.",
    branchesSelectClient:
      "Selecciona un cliente de la lista para gestionar sus direcciones.",
    branchesSelectedClientLabel: "Cliente activo",
    branchesLoading: "Cargando direcciones...",
    branchesLoadError: "No fue posible cargar las direcciones.",
    branchCreateError: "No fue posible guardar la dirección.",
    branchCreateSuccess: "Dirección creada correctamente.",
    branchUpdateSuccess: "Dirección actualizada correctamente.",
    branchSave: "Crear dirección",
    branchUpdate: "Guardar cambios",
    branchSaving: "Guardando dirección...",
    branchNew: "Nueva dirección",
    branchListTitle: "Direcciones registradas",
    branchSummaryFallback: "Sin datos de contacto",
    branchSelectedSummary: "Dirección seleccionada",
    branchEdit: "Editar",
    branchFields: {
      name: "Etiqueta",
      address: "Dirección",
      phone: "Teléfono",
      contact: "Contacto",
      notes: "Notas"
    },
    branchPlaceholders: {
      name: "Casa, Oficina, Local, Bodega...",
      address: "Ingresa la dirección",
      phone: "Ingresa el teléfono de la dirección",
      contact: "Ingresa el contacto de la dirección",
      notes: "Notas operativas de la dirección"
    },
    branchHeaders: {
      name: "Dirección",
      address: "Dirección",
      phone: "Teléfono",
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
    title: "Técnicos",
    description:
      "Administra el equipo técnico y mantén una lista actualizada para futuras asignaciones y rutas de trabajo.",
    subTabs: {
      list: "Lista de técnicos",
      form: "Alta / edición"
    },
    formCreateTitle: "Nuevo técnico",
    formEditTitle: "Editar técnico",
    formCreateBody:
      "Registra un nuevo técnico para dejarlo disponible en las asignaciones y órdenes de servicio.",
    formEditBody:
      "Actualiza la información del técnico seleccionado usando el mismo formulario operativo.",
    fields: {
      fullName: "Nombre completo",
      phone: "Teléfono",
      address: "Dirección",
      notes: "Notas",
      isActive: "Técnico activo"
    },
    placeholders: {
      fullName: "Ingresa el nombre completo del técnico",
      phone: "Ingresa el teléfono del técnico",
      address: "Ingresa la dirección del técnico",
      notes: "Notas operativas del técnico"
    },
    save: "Crear técnico",
    update: "Guardar cambios",
    newTechnician: "Nuevo técnico",
    saving: "Guardando técnico...",
    success: "Técnico creado correctamente.",
    updateSuccess: "Técnico actualizado correctamente.",
    createError: "No fue posible crear el técnico.",
    configError: "Supabase no esta configurado correctamente.",
    listTitle: "Técnicos registrados",
    empty: "Todavía no hay técnicos. Crea el primero arriba.",
    headers: {
      fullName: "Nombre completo",
      phone: "Teléfono",
      status: "Estado",
      createdAt: "Creado el"
    },
    loading: "Cargando técnicos...",
    loadError: "No fue posible cargar los técnicos.",
    active: "Activo",
    inactive: "Inactivo",
    edit: "Editar",
    schemaWarning:
      "La tabla de técnicos aún no incluye Teléfono, Dirección y Notas. Puedes seguir usando el módulo con el esquema actual.",
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
