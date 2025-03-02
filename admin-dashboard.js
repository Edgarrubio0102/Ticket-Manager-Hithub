<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Panel del Administrador</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- FontAwesome CDN -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" integrity="sha512-Kc323vGBEqzTmouAECnVceyQqyqdsSiqLQISBL29aUW4U/M7pSPA/gEuZQqv1cwxKYO6O3sYCEH7wAZHRioC+5A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        /* Estilos personalizados adicionales */
        .gradient-bg-admin {
            background: linear-gradient(135deg, #4b5563, #9ca3af);
        }
        .hover-scale {
            transition: transform 0.3s ease;
        }
        .hover-scale:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body class="min-h-screen flex flex-col gradient-bg-admin text-gray-100 font-sans">
    <!-- Menú de Navegación -->
    <nav class="bg-white shadow-lg py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div class="text-xl font-bold text-gray-800">
            <a href="admin-login.html" class="hover:text-blue-600 transition-colors">TicketMaster</a>
        </div>
        <div class="space-x-6">
            <a href="admin-login.html" class="text-gray-600 hover:text-blue-600 transition-colors"><i class="fas fa-home mr-1"></i> Portal Cliente</a>
            <a href="admin-tickets.html" class="text-gray-600 hover:text-blue-600 transition-colors"><i class="fas fa-ticket-alt mr-1"></i> Tickets</a>
            <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors"><i class="fas fa-chart-line mr-1"></i> Dashboard</a>
            <a href="admin-config.html" class="text-gray-600 hover:text-blue-600 transition-colors"><i class="fas fa-cog mr-1"></i> Configuración</a>
            <a href="#" id="logoutBtn" class="text-gray-600 hover:text-red-600 transition-colors"><i class="fas fa-sign-out-alt mr-1"></i> Cerrar Sesión</a>
        </div>
    </nav>

    <!-- Contenido Principal -->
    <main class="flex-grow flex items-center justify-center py-12 px-4">
        <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl">
            <h1 class="text-3xl font-bold text-gray-800 text-center mb-6">Dashboard</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Tickets por Estado</h2>
                    <canvas id="ticketsByStatusChart" class="w-full"></canvas>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Tiempo Promedio de Resolución</h2>
                    <canvas id="resolutionTimeChart" class="w-full"></canvas>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 text-gray-300 py-4 text-center">
        <p>© 2025 TicketMaster. Todos los derechos reservados.</p>
    </footer>

    <!-- Firebase SDK -->
    <script type="module">
        // Import Firebase SDKs
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
        import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
        import { getFirestore, collection, query, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
        import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

        // Firebase Config
        const firebaseConfig = {
            apiKey: "AIzaSyA7BYQx6Fxz9BNRX9bcIRAawbdS258XFoE",
            authDomain: "ticket-cotizador-1.firebaseapp.com",
            projectId: "ticket-cotizador-1",
            storageBucket: "ticket-cotizador-1.firebasestorage.app",
            messagingSenderId: "185634330034",
            appId: "1:185634330034:web:5429c6dbfc64fc6d4dc0ab"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // DOM Elements
        const logoutBtn = document.getElementById('logoutBtn');
        const ticketsByStatusChart = document.getElementById('ticketsByStatusChart').getContext('2d');
        const resolutionTimeChart = document.getElementById('resolutionTimeChart').getContext('2d');

        let ticketsByStatusChartInstance = null;
        let resolutionTimeChartInstance = null;

        // Check Auth State and Role
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'admin-login.html';
            } else {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().role === "admin") {
                    loadDashboardData();
                } else {
                    window.location.href = 'index.html'; // Redirigir a portal cliente si no es admin
                }
            }
        });

        // Load Dashboard Data
        function loadDashboardData() {
            const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
            onSnapshot(q, (snapshot) => {
                const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                updateCharts(tickets);
            }, (error) => {
                console.error("Error loading dashboard data:", error);
            });
        }

        // Update Charts
        function updateCharts(tickets) {
            // Tickets por Estado (Pie Chart)
            const statusCounts = {
                'abierto': 0,
                'en-progreso': 0,
                'resuelto': 0,
                'cerrado': 0
            };
            tickets.forEach(ticket => {
                statusCounts[ticket.status]++;
            });

            const statusLabels = Object.keys(statusCounts);
            const statusData = Object.values(statusCounts);

            if (ticketsByStatusChartInstance) {
                ticketsByStatusChartInstance.destroy();
            }
            ticketsByStatusChartInstance = new Chart(ticketsByStatusChart, {
                type: 'pie',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        data: statusData,
                        backgroundColor: ['#4B5563', '#9CA3AF', '#10B981', '#EF4444']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#374151'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Tickets por Estado',
                            color: '#374151'
                        }
                    }
                }
            });

            // Tiempo Promedio de Resolución (Bar Chart)
            const resolutionTimes = tickets
                .filter(ticket => ticket.status === 'resuelto' && ticket.updatedAt)
                .map(ticket => {
                    const created = new Date(ticket.createdAt);
                    const updated = new Date(ticket.updatedAt);
                    return (updated - created) / (1000 * 60 * 60 * 24); // Días
                })
                .filter(time => !isNaN(time));

            const avgResolutionTime = resolutionTimes.length ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

            if (resolutionTimeChartInstance) {
                resolutionTimeChartInstance.destroy();
            }
            resolutionTimeChartInstance = new Chart(resolutionTimeChart, {
                type: 'bar',
                data: {
                    labels: ['Tiempo Promedio'],
                    datasets: [{
                        label: 'Días',
                        data: [avgResolutionTime],
                        backgroundColor: '#3B82F6',
                        borderColor: '#1E40AF',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Días',
                                color: '#374151'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Tiempo Promedio de Resolución',
                            color: '#374151'
                        }
                    }
                }
            });
        }

        // Logout
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                console.log('Logged out');
                window.location.href = 'admin-login.html';
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        });
    </script>
</body>
</html>