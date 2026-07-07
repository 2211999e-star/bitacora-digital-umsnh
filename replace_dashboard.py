NEW_DASHBOARD = '''<section id="section-dashboard" class="section">

                    <!-- Hero Header -->
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <div>
                            <p class="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-1">Centro de Control</p>
                            <h2 class="text-3xl font-black text-gray-900 dark:text-white">Dashboard</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Resumen operativo en tiempo real &middot; <span id="dashboard-updated-at" class="font-medium text-gray-700 dark:text-gray-300">Actualizando...</span></p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button onclick="loadDashboardData(window._dbCtx)" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                                <i class="fas fa-rotate-right"></i> Actualizar
                            </button>
                            <button onclick="showNotifications()" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30">
                                <i class="fas fa-bell"></i> Recordatorios
                            </button>
                        </div>
                    </div>

                    <!-- Hero Slider -->
                    <div class="w-full relative rounded-2xl overflow-hidden mb-8 shadow-2xl border border-gray-200 dark:border-gray-800 group" style="height:200px;" id="hero-slider-container">
                        <div id="dashboard-slider" class="flex w-full h-full transition-transform duration-500 ease-out" style="transform: translateX(0%);">
                            <div class="w-full shrink-0 h-full flex flex-col justify-end p-6 lg:p-10 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative">
                                <div class="absolute inset-0 opacity-20" style="background:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.05) 10px,rgba(255,255,255,.05) 20px)"></div>
                                <div class="relative z-10">
                                    <span class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/20 rounded-full mb-3 inline-block border border-white/20">&#x1F4CB; Sistema Activo</span>
                                    <h3 class="text-2xl lg:text-3xl font-black mb-1">Bit&aacute;cora Digital UMSNH</h3>
                                    <p class="text-blue-100 text-sm opacity-90">Registra, da seguimiento y exporta incidencias de mantenimiento desde un solo lugar.</p>
                                </div>
                            </div>
                            <div class="w-full shrink-0 h-full flex flex-col justify-end p-6 lg:p-10 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white relative">
                                <div class="absolute inset-0 opacity-10" style="background:radial-gradient(circle at 80% 20%, white 1px, transparent 1px) 0 0/30px 30px"></div>
                                <div class="relative z-10">
                                    <span class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/20 rounded-full mb-3 inline-block border border-white/20">&#x26A1; B&uacute;squeda r&aacute;pida</span>
                                    <h3 class="text-2xl lg:text-3xl font-black mb-1">Ctrl + K para Buscar</h3>
                                    <p class="text-emerald-100 text-sm opacity-90">Encuentra incidencias, eventos y registros al instante con el buscador inteligente.</p>
                                </div>
                            </div>
                            <div class="w-full shrink-0 h-full flex flex-col justify-end p-6 lg:p-10 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 text-white relative">
                                <div class="absolute inset-0 opacity-10" style="background:repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,.1) 40px,rgba(255,255,255,.1) 41px)"></div>
                                <div class="relative z-10">
                                    <span class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/20 rounded-full mb-3 inline-block border border-white/20">&#x1F4CA; Reportes</span>
                                    <h3 class="text-2xl lg:text-3xl font-black mb-1">Exporta en PDF o CSV</h3>
                                    <p class="text-purple-100 text-sm opacity-90">Genera reportes oficiales con logos y firma desde la secci&oacute;n de Reportes.</p>
                                </div>
                            </div>
                        </div>
                        <button id="slider-prev" class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/70 text-white rounded-full border border-white/20 z-20 shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all outline-none">
                            <i class="fas fa-chevron-left text-sm"></i>
                        </button>
                        <button id="slider-next" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/70 text-white rounded-full border border-white/20 z-20 shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all outline-none">
                            <i class="fas fa-chevron-right text-sm"></i>
                        </button>
                        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20" id="slider-dots">
                            <button class="slider-dot w-6 h-1.5 rounded-full bg-white transition-all outline-none" data-index="0"></button>
                            <button class="slider-dot w-2 h-1.5 rounded-full bg-white/40 hover:bg-white/80 transition-all outline-none" data-index="1"></button>
                            <button class="slider-dot w-2 h-1.5 rounded-full bg-white/40 hover:bg-white/80 transition-all outline-none" data-index="2"></button>
                        </div>
                    </div>
                    <script>
                        (function() {
                            let currentSlide = 0;
                            const totalSlides = 3;
                            const slider = document.getElementById('dashboard-slider');
                            const dots = document.querySelectorAll('.slider-dot');
                            let autoPlayInterval;
                            function updateSlider(index) {
                                currentSlide = index;
                                slider.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
                                dots.forEach(function(dot, i) {
                                    if(i === currentSlide) { dot.classList.remove('w-2','bg-white/40'); dot.classList.add('w-6','bg-white'); }
                                    else { dot.classList.remove('w-6','bg-white'); dot.classList.add('w-2','bg-white/40'); }
                                });
                            }
                            function nextSlide() { updateSlider((currentSlide + 1) % totalSlides); }
                            function prevSlide() { updateSlider((currentSlide - 1 + totalSlides) % totalSlides); }
                            document.getElementById('slider-next').addEventListener('click', function() { nextSlide(); resetAutoPlay(); });
                            document.getElementById('slider-prev').addEventListener('click', function() { prevSlide(); resetAutoPlay(); });
                            dots.forEach(function(dot) { dot.addEventListener('click', function(e) { updateSlider(parseInt(e.target.dataset.index)); resetAutoPlay(); }); });
                            function startAutoPlay() { autoPlayInterval = setInterval(nextSlide, 5000); }
                            function resetAutoPlay() { clearInterval(autoPlayInterval); startAutoPlay(); }
                            const c = document.getElementById('hero-slider-container');
                            c.addEventListener('mouseenter', function() { clearInterval(autoPlayInterval); });
                            c.addEventListener('mouseleave', startAutoPlay);
                            startAutoPlay();
                        })();
                    </script>

                    <!-- KPI Stats Row (4 Big Cards) -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <button type="button" onclick="showSection('activities'); openActivitiesPreset('pendiente','','','','delivery_asc')" class="group relative bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            <div class="flex items-start justify-between">
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Abiertas</p>
                                    <p id="stat-open" class="text-4xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Sin resoluci&oacute;n</p>
                                </div>
                                <div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <i class="fas fa-clock text-orange-500"></i>
                                </div>
                            </div>
                        </button>
                        <button type="button" onclick="showSection('activities'); openActivitiesPreset('en_proceso','','','','delivery_asc')" class="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            <div class="flex items-start justify-between">
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">En Proceso</p>
                                    <p id="stat-waiting" class="text-4xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">En atenci&oacute;n</p>
                                </div>
                                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <i class="fas fa-spinner text-blue-500"></i>
                                </div>
                            </div>
                        </button>
                        <button type="button" onclick="showSection('activities'); openActivitiesPreset('completado')" class="group relative bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            <div class="flex items-start justify-between">
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Resueltos</p>
                                    <p id="stat-resolved" class="text-4xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Tickets cerrados</p>
                                </div>
                                <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <i class="fas fa-check-circle text-emerald-500"></i>
                                </div>
                            </div>
                        </button>
                        <button type="button" onclick="showSection('activities'); openActivitiesPreset('','','','overdue','delivery_asc')" class="group relative bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            <div class="flex items-start justify-between">
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Cr&iacute;ticas</p>
                                    <p id="stat-critical" class="text-4xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Urgentes / vencidas</p>
                                </div>
                                <div class="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <i class="fas fa-triangle-exclamation text-red-500"></i>
                                </div>
                            </div>
                        </button>
                    </div>

                    <!-- Acciones rapidas + Alerta operativa -->
                    <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-5">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Acciones r&aacute;pidas</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Accede a las funciones principales del sistema.</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button onclick="showSection('activities'); setTimeout(function() { openActivityModal(); }, 100)" class="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                        <i class="fas fa-plus text-white text-lg"></i>
                                    </div>
                                    <span class="text-sm font-semibold text-blue-900 dark:text-blue-100 text-center leading-tight">Nueva Incidencia</span>
                                </button>
                                <button onclick="showSection('events'); setTimeout(function() { openEventModal(); }, 100)" class="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                    <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                                        <i class="fas fa-calendar-plus text-white text-lg"></i>
                                    </div>
                                    <span class="text-sm font-semibold text-purple-900 dark:text-purple-100 text-center leading-tight">Nuevo Evento</span>
                                </button>
                                <button onclick="showSection('reports')" class="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                    <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                                        <i class="fas fa-file-pdf text-white text-lg"></i>
                                    </div>
                                    <span class="text-sm font-semibold text-emerald-900 dark:text-emerald-100 text-center leading-tight">Ver Reportes</span>
                                </button>
                                <button onclick="openCommandPalette()" class="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                    <div class="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <i class="fas fa-magnifying-glass text-white text-lg"></i>
                                    </div>
                                    <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 text-center leading-tight">Buscar (Ctrl+K)</span>
                                </button>
                            </div>
                            <div class="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                                <button onclick="showSection('activities'); openActivitiesPreset()" class="text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-3 transition-colors">
                                    <p class="text-2xl font-black text-gray-900 dark:text-white" id="stat-total">0</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total incidencias</p>
                                </button>
                                <button onclick="showSection('activities'); openActivitiesPreset('','preventivo')" class="text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-3 transition-colors">
                                    <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400" id="stat-maint-prev-total">0</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Preventivo</p>
                                </button>
                                <button onclick="showSection('activities'); openActivitiesPreset('','correctivo')" class="text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-3 transition-colors">
                                    <p class="text-2xl font-black text-orange-500 dark:text-orange-400" id="stat-maint-corr-total">0</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Correctivo</p>
                                </button>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col">
                            <div class="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Alerta operativa</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Prioridades inmediatas.</p>
                                </div>
                                <span id="dashboard-alert-badge" class="status-chip status-warning flex-shrink-0">0 alertas</span>
                            </div>
                            <div id="dashboard-alerts" class="space-y-3 flex-1">
                                <p class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">Cargando alertas...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Salud del sistema -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <button type="button" onclick="showSection('activities'); setActivitiesStatusFilter('completado')" class="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all">
                            <div class="flex items-center justify-between gap-3">
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">OK &mdash; Bajo control</p>
                                    <p id="dashboard-health-ok" class="text-4xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Completadas y controladas</p>
                                </div>
                                <div class="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                                    <i class="fas fa-circle-check text-2xl text-emerald-500"></i>
                                </div>
                            </div>
                        </button>
                        <button type="button" onclick="showSection('activities'); setActivitiesStatusFilter('activos')" class="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 text-left hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all">
                            <div class="flex items-center justify-between gap-3">
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Atenci&oacute;n requerida</p>
                                    <p id="dashboard-health-warning" class="text-4xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Pendientes y en proceso</p>
                                </div>
                                <div class="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                                    <i class="fas fa-triangle-exclamation text-2xl text-amber-500"></i>
                                </div>
                            </div>
                        </button>
                        <button type="button" onclick="showSection('activities'); setActivitiesDeliveryFilter('overdue')" class="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 text-left hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all">
                            <div class="flex items-center justify-between gap-3">
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Urgente</p>
                                    <p id="dashboard-health-urgent" class="text-4xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Cr&iacute;ticas o vencidas</p>
                                </div>
                                <div class="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                                    <i class="fas fa-bolt text-2xl text-red-500"></i>
                                </div>
                            </div>
                        </button>
                    </div>

                    <!-- KPIs + Calendario -->
                    <div class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 mb-6">
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-5">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Indicadores clave</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Fechas, avance y tiempo promedio.</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 dashboard-kpi-card">
                                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Eventos (3 d&iacute;as)</p>
                                    <p id="kpi-upcoming-events" class="text-3xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-xs text-gray-400 mt-1">Pr&oacute;ximos</p>
                                </div>
                                <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-4 bg-red-50/60 dark:bg-red-900/10">
                                    <p class="text-xs font-semibold text-red-600 dark:text-red-300 uppercase tracking-wider">Eventos</p>
                                    <p id="kpi-overdue-events" class="text-3xl font-black text-red-600 dark:text-red-300 mt-2">0</p>
                                    <p class="text-xs text-red-500/80 mt-1">Atrasados</p>
                                </div>
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 dashboard-kpi-card">
                                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tasa de cierre</p>
                                    <p id="kpi-completion-rate" class="text-3xl font-black text-gray-900 dark:text-white mt-2">0%</p>
                                    <p class="text-xs text-gray-400 mt-1">Completadas/total</p>
                                </div>
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 dashboard-kpi-card">
                                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entregas (1 d&iacute;a)</p>
                                    <p id="kpi-due-deliveries" class="text-3xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-xs text-gray-400 mt-1">Pr&oacute;ximas</p>
                                </div>
                                <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-4 bg-red-50/60 dark:bg-red-900/10">
                                    <p class="text-xs font-semibold text-red-600 dark:text-red-300 uppercase tracking-wider">Entregas</p>
                                    <p id="kpi-overdue-deliveries" class="text-3xl font-black text-red-600 dark:text-red-300 mt-2">0</p>
                                    <p class="text-xs text-red-500/80 mt-1">Atrasadas</p>
                                </div>
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 dashboard-kpi-card">
                                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tiempo prom.</p>
                                    <p id="kpi-avg-resolution" class="text-3xl font-black text-gray-900 dark:text-white mt-2">&mdash;</p>
                                    <p class="text-xs text-gray-400 mt-1">Recibido&rarr;entrega</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 dashboard-kpi-card">
                                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creadas hoy</p>
                                    <p id="kpi-created-today" class="text-2xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                    <p class="text-xs text-gray-400 mt-1">Incidencias nuevas</p>
                                </div>
                                <div class="rounded-xl border border-emerald-200 dark:border-emerald-900/40 p-4 bg-emerald-50/60 dark:bg-emerald-900/10">
                                    <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">Entregadas hoy</p>
                                    <p id="kpi-delivered-today" class="text-2xl font-black text-emerald-600 dark:text-emerald-300 mt-2">0</p>
                                    <p class="text-xs text-emerald-500/80 mt-1">Completadas hoy</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Calendario</h3>
                                    <p id="dashboard-calendar-month" class="text-sm text-gray-500 dark:text-gray-400">Mes actual</p>
                                </div>
                                <span class="status-chip status-muted">Operativo</span>
                            </div>
                            <div id="dashboard-calendar" class="dashboard-calendar flex-1"></div>
                            <div class="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-800/40">
                                <p id="dashboard-calendar-summary" class="text-sm text-gray-600 dark:text-gray-300">Sin eventos pr&oacute;ximos en calendario.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Items criticos + Proximos 7 dias -->
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">&Iacute;tems cr&iacute;ticos</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Alta prioridad, urgentes o con entrega vencida.</p>
                                </div>
                                <span id="badge-critical-open" class="status-chip status-warning">0 abiertas</span>
                            </div>
                            <div id="dashboard-critical-items" class="space-y-3">
                                <p class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">Cargando &iacute;tems cr&iacute;ticos...</p>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Pr&oacute;ximos 7 d&iacute;as</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Eventos y entregas con seguimiento cercano.</p>
                                </div>
                                <span id="badge-next-seven" class="status-chip status-success">0 registros</span>
                            </div>
                            <div id="dashboard-next-window" class="space-y-3">
                                <p class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">Cargando agenda pr&oacute;xima...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Recientes + Recordatorios + Eventos pendientes -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Incidencias recientes</h3>
                                <button onclick="showSection('activities')" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Ver todas</button>
                            </div>
                            <div id="recent-activities" class="space-y-3">
                                <p class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">No hay incidencias recientes</p>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Recordatorios</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Eventos (3 d&iacute;as) &middot; Entregas (1 d&iacute;a)</p>
                                </div>
                                <button onclick="showNotifications()" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Abrir</button>
                            </div>
                            <div id="dashboard-reminders" class="space-y-3">
                                <p class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">Cargando recordatorios...</p>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Eventos pendientes</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Total: <span id="stat-events-pending" class="font-bold text-orange-500">0</span></p>
                                </div>
                                <button onclick="showSection('events')" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Ver eventos</button>
                            </div>
                            <div id="pending-events" class="space-y-3">
                                <p class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">No hay eventos pendientes</p>
                            </div>
                        </div>
                    </div>

                    <!-- Top departamentos + Servicios -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Top departamentos</h3>
                                <button onclick="showSection('activities')" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Ver incidencias</button>
                            </div>
                            <div id="dashboard-top-departments" class="space-y-2">
                                <p class="text-gray-400 dark:text-gray-500 text-sm">Cargando...</p>
                            </div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Top tipos de servicio</h3>
                                <button onclick="showSection('activities')" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Ver incidencias</button>
                            </div>
                            <div id="dashboard-top-services" class="space-y-2">
                                <p class="text-gray-400 dark:text-gray-500 text-sm">Cargando...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Distribucion + Historico -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Distribuci&oacute;n por estado</h3>
                                <button onclick="showSection('activities')" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Ver lista</button>
                            </div>
                            <div id="dashboard-status-distribution" class="space-y-3">
                                <p class="text-gray-400 dark:text-gray-500 text-center py-8 text-sm">Cargando distribuci&oacute;n...</p>
                            </div>
                        </div>
                        <div class="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                            <button type="button" onclick="showSection('activities'); openActivitiesPreset('','','','','date_desc')" class="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 -m-2 p-2 rounded-xl transition-colors">
                                <p class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hist&oacute;rico total</p>
                                <p id="stat-history-total" class="text-5xl font-black text-gray-900 dark:text-white mt-2">0</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Ejecuciones registradas &rarr; <span class="text-blue-600 dark:text-blue-400 font-semibold">Ver incidencias</span></p>
                            </button>
                            <div class="mt-5 grid grid-cols-2 gap-4">
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                    <p class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tasa de cierre</p>
                                    <p id="stat-history-completion" class="text-xl font-black text-gray-900 dark:text-white mt-2">0% completadas</p>
                                </div>
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                    <p class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Correctivas abiertas</p>
                                    <p id="stat-corrective-open" class="text-xl font-black text-orange-500 mt-2">0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Graficas Analisis -->
                    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm mb-6">
                        <details>
                            <summary class="cursor-pointer select-none flex items-center justify-between list-none">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">An&aacute;lisis y gr&aacute;ficas</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Estados, servicios, tendencia y departamentos.</p>
                                </div>
                                <span class="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">Mostrar <i class="fas fa-chevron-down text-xs"></i></span>
                            </summary>
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 class="text-sm font-bold text-gray-900 dark:text-white">Estados de Tareas</h4>
                                        <span class="text-xs text-gray-400">Dona</span>
                                    </div>
                                    <div class="dashboard-chart h-[190px]"><canvas id="chart-status"></canvas></div>
                                </div>
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 class="text-sm font-bold text-gray-900 dark:text-white">Tipos de Servicio</h4>
                                        <span class="text-xs text-gray-400">Barras</span>
                                    </div>
                                    <div class="dashboard-chart h-[220px]"><canvas id="chart-services"></canvas></div>
                                </div>
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 class="text-sm font-bold text-gray-900 dark:text-white">Tendencia (14 d&iacute;as)</h4>
                                        <span class="text-xs text-gray-400">L&iacute;nea</span>
                                    </div>
                                    <div class="dashboard-chart h-[220px]"><canvas id="chart-trend"></canvas></div>
                                </div>
                                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 class="text-sm font-bold text-gray-900 dark:text-white">Departamentos (Top 6)</h4>
                                        <span class="text-xs text-gray-400">Barras</span>
                                    </div>
                                    <div class="dashboard-chart h-[220px]"><canvas id="chart-departments"></canvas></div>
                                </div>
                            </div>
                        </details>
                    </div>

                    <!-- Hidden stat elements still needed by dashboard.js -->
                    <span id="stat-pending" class="hidden">0</span>
                    <span id="stat-completed" class="hidden">0</span>
                    <span id="stat-in-progress" class="hidden">0</span>
                    <span id="stat-canceled" class="hidden">0</span>
                    <span id="stat-critical-open" class="hidden">0</span>
                    <span id="stat-corrective-total" class="hidden">0</span>
                    <span id="stat-corrective-closed" class="hidden">0</span>
                    <span id="stat-maint-prev-pending" class="hidden">0</span>
                    <span id="stat-maint-corr-pending" class="hidden">0</span>

                </section>'''

with open('index.html', encoding='utf-8') as f:
    content = f.read()

start_marker = '<section id="section-dashboard" class="section">'
end_marker = '</section>\n\n                <!-- Activities Section'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
else:
    new_content = content[:start_idx] + NEW_DASHBOARD + '\n\n                <!-- Activities Section' + content[end_idx + len('</section>\n\n                <!-- Activities Section'):]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Done! Replaced {end_idx - start_idx} chars with new dashboard ({len(NEW_DASHBOARD)} chars)")
