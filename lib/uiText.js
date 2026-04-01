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
      technicianName: "Tecnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      status: "Estado",
      createdAt: "Creada el"
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
      "Crea y asigna una nueva orden de servicio. El campo de notas solo se muestra en la interfaz por ahora y todavia no se guarda en la base de datos.",
    fields: {
      client: "Cliente",
      technician: "Tecnico",
      serviceDate: "Fecha de servicio",
      serviceTime: "Hora de servicio",
      status: "Estado",
      notes: "Notas"
    },
    placeholders: {
      client: "Selecciona un cliente",
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
      "Administra las cuentas de clientes para mantenerlas disponibles en la programacion y en las ordenes de servicio.",
    fieldLabel: "Nombre del cliente",
    fieldPlaceholder: "Ingresa el nombre del cliente",
    save: "Crear cliente",
    saving: "Guardando cliente...",
    success: "Cliente creado correctamente.",
    createError: "No fue posible crear el cliente.",
    configError: "Supabase no esta configurado correctamente.",
    listTitle: "Clientes registrados",
    empty: "Todavia no hay clientes. Crea el primero arriba.",
    headers: {
      name: "Nombre",
      createdAt: "Creado el"
    },
    loading: "Cargando clientes...",
    loadError: "No fue posible cargar los clientes."
  },
  technicians: {
    title: "Tecnicos",
    description:
      "Administra el equipo tecnico y manten una lista actualizada para futuras asignaciones y rutas de trabajo.",
    fields: {
      fullName: "Nombre completo",
      isActive: "Tecnico activo"
    },
    placeholders: {
      fullName: "Ingresa el nombre completo del tecnico"
    },
    save: "Crear tecnico",
    saving: "Guardando tecnico...",
    success: "Tecnico creado correctamente.",
    createError: "No fue posible crear el tecnico.",
    configError: "Supabase no esta configurado correctamente.",
    listTitle: "Tecnicos registrados",
    empty: "Todavia no hay tecnicos. Crea el primero arriba.",
    headers: {
      fullName: "Nombre completo",
      status: "Estado",
      createdAt: "Creado el"
    },
    loading: "Cargando tecnicos...",
    loadError: "No fue posible cargar los tecnicos.",
    active: "Activo",
    inactive: "Inactivo"
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
