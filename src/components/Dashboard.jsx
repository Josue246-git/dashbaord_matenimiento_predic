import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import axios from 'axios';

const Dashboard = () => {
  const [motorData, setMotorData] = useState([]);
  const [status, setStatus] = useState('normal');
  const [revolucionNivel, setRevolucionNivel] = useState(1);
  
  // Configuración de ThingSpeak (comentada por ahora)
  // const THINGSPEAK_CHANNEL_ID = "TU_CHANNEL_ID";
  // const THINGSPEAK_API_KEY = "TU_API_KEY";
  const UPDATE_INTERVAL = 3000;

  // Rangos para cada nivel de revolución
  const RANGOS = {
    nivel1: {
      normal: {
        x: { min: 1.5, max: 12.5 },
        y: { min: -11.2, max: 0.9 },
        z: { min: 20.0, max: 20.1 }
      },
      alerta: {
        x: { min: 1.6, max: 17.8 },
        y: { min: -14.8, max: 4.1 },
        z: { min: 20.0, max: 20.1 }
      },
      falla: {
        x: { min: -8.7, max: 20.0 },
        y: { min: -15.5, max: 6.9 },
        z: { min: 18.0, max: 20.1 }
      }
    },
    nivel2: {
      normal: {
        x: { min: 3.2, max: 10.6 },
        y: { min: -8.3, max: -2.0 },
        z: { min: 20.0, max: 20.1 }
      },
      alerta: {
        x: { min: 1.2, max: 15.8 },
        y: { min: -13.8, max: 2.4 },
        z: { min: 20.0, max: 20.1 }
      },
      falla: {
        x: { min: 0.3, max: 20.0 },
        y: { min: -16.4, max: 6.2 },
        z: { min: 20.0, max: 20.1 }
      }
    }
  };

  const getStatusInfo = (data) => {
    if (!data.length) return { 
      status: 'normal', 
      icon: CheckCircleIcon, 
      color: 'text-status-normal',
      nivel: revolucionNivel 
    };
    
    const lastReading = data[data.length - 1];
    const rangosNivel = RANGOS[`nivel${revolucionNivel}`];

    // Función para verificar si un valor está en un rango
    const enRango = (valor, rango) => {
      return valor >= rango.min && valor <= rango.max;
    };

    // Verificar si los valores están en rangos de falla
    const esFalla = 
      enRango(Math.abs(lastReading.accel_x), rangosNivel.falla.x) ||
      enRango(Math.abs(lastReading.accel_y), rangosNivel.falla.y) ||
      enRango(Math.abs(lastReading.accel_z), rangosNivel.falla.z);

    if (esFalla) {
      return { 
        status: 'Falla Inminente', 
        icon: XCircleIcon, 
        color: 'text-red-500',
        nivel: revolucionNivel
      };
    }

    // Verificar si los valores están en rangos de alerta
    const esAlerta = 
      enRango(Math.abs(lastReading.accel_x), rangosNivel.alerta.x) ||
      enRango(Math.abs(lastReading.accel_y), rangosNivel.alerta.y) ||
      enRango(Math.abs(lastReading.accel_z), rangosNivel.alerta.z);

    if (esAlerta) {
      return { 
        status: 'Alerta', 
        icon: ExclamationTriangleIcon, 
        color: 'text-yellow-500',
        nivel: revolucionNivel
      };
    }

    // Si no es falla ni alerta, está en rango normal
    return { 
      status: 'Operación Normal', 
      icon: CheckCircleIcon, 
      color: 'text-green-500',
      nivel: revolucionNivel
    };
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'Operación Normal':
        return {
          description: `Licuadora funcionando correctamente en nivel ${revolucionNivel}`,
          recommendation: 'Continuar con el uso normal'
        };
      case 'Alerta':
        return {
          description: `Vibraciones elevadas detectadas en nivel ${revolucionNivel}`,
          recommendation: 'Revisar contenido y ajuste de cuchillas'
        };
      case 'Falla Inminente':
        return {
          description: `¡Niveles críticos en revoluciones nivel ${revolucionNivel}!`,
          recommendation: '¡Detener la licuadora inmediatamente!'
        };
      default:
        return {
          description: 'Estado desconocido',
          recommendation: 'Verificar el funcionamiento'
        };
    }
  };

  // Función para generar datos ficticios según el nivel
  const generarDatosFicticios = (nivel) => {
    const rangos = RANGOS[`nivel${nivel}`].normal;
    
    // Genera valores aleatorios dentro de los rangos normales
    const randomEnRango = (min, max) => {
      return Math.random() * (max - min) + min;
    };

    // Ocasionalmente genera datos de alerta o falla (20% de probabilidad)
    const probabilidad = Math.random();
    if (probabilidad > 0.8) {
      // Datos de alerta o falla
      return {
        timestamp: new Date().toISOString(),
        accel_x: randomEnRango(-8.7, 20.0),
        accel_y: randomEnRango(-15.5, 6.9),
        accel_z: randomEnRango(18.0, 20.1)
      };
    }

    // Datos normales
    return {
      timestamp: new Date().toISOString(),
      accel_x: randomEnRango(rangos.x.min, rangos.x.max),
      accel_y: randomEnRango(rangos.y.min, rangos.y.max),
      accel_z: randomEnRango(rangos.z.min, rangos.z.max)
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Comentamos la llamada a ThingSpeak
        /*const response = await axios.get(
          `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json`,
          {
            params: {
              api_key: THINGSPEAK_API_KEY,
              results: 20,
            }
          }
        );*/
        
        // En su lugar, generamos datos ficticios
        const nuevosDatos = generarDatosFicticios(revolucionNivel);
        
        setMotorData(prevData => {
          // Mantener solo los últimos 20 registros
          const updatedData = [...prevData, nuevosDatos].slice(-20);
          return updatedData;
        });
        
        // Actualizar el estado
        setStatus(getStatusInfo([nuevosDatos]).status);
      } catch (error) {
        console.error('Error al generar datos:', error);
      }
    };

    // Hacer la primera llamada inmediatamente
    fetchData();

    // Configurar el intervalo de actualización
    const interval = setInterval(fetchData, UPDATE_INTERVAL);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, [revolucionNivel]); // Agregamos revolucionNivel como dependencia

  const statusInfo = getStatusInfo(motorData);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              Monitor Licuadora Oster BLST4655
            </h1>
            <select
              value={revolucionNivel}
              onChange={(e) => setRevolucionNivel(Number(e.target.value))}
              className="bg-gray-700 text-white rounded-lg px-3 py-2"
            >
              <option value={1}>Nivel 1</option>
              <option value={2}>Nivel 2</option>
            </select>
          </div>
          
          <div className="mt-4 p-4 bg-gray-800 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <StatusIcon className={`h-8 w-8 sm:h-10 sm:w-10 ${statusInfo.color}`} />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${statusInfo.color}`}>
                    {statusInfo.status}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-400">
                    {getStatusDetails(statusInfo.status).description}
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto bg-gray-700 rounded-lg p-3">
                <div className="text-sm sm:text-base">
                  <p className="text-gray-300 font-medium mb-1">Recomendación:</p>
                  <p className={`${statusInfo.color}`}>
                    {getStatusDetails(statusInfo.status).recommendation}
                  </p>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  Última actualización: {' '}
                  <span className="font-medium">
                    {motorData.length > 0 
                      ? new Date(motorData[motorData.length - 1].timestamp).toLocaleTimeString() 
                      : '--:--:--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['X', 'Y', 'Z'].map((axis) => {
                const value = motorData.length > 0 
                  ? motorData[motorData.length - 1][`accel_${axis.toLowerCase()}`] 
                  : 0;
                const vibrationLevel = Math.abs(value);
                const getVibrationColor = (level) => {
                  if (level > 6) return 'bg-red-500';
                  if (level > 3) return 'bg-yellow-500';
                  return 'bg-green-500';
                };

                return (
                  <div key={axis} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Vibración Eje {axis}</span>
                      <span className="font-bold">{value.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getVibrationColor(vibrationLevel)} transition-all duration-300`}
                        style={{ width: `${Math.min((vibrationLevel / 8) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
          <h2 className="text-lg sm:text-xl mb-4 font-medium">Señales del Acelerómetro</h2>
          
          <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={motorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp"
                  tick={{ fill: '#9CA3AF', fontSize: '12px' }}
                  tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                  height={50}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis 
                  tick={{ fill: '#9CA3AF', fontSize: '12px' }}
                  width={40}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '14px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accel_x" 
                  stroke="#ef4444" 
                  dot={false}
                  name="Eje X"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="accel_y" 
                  stroke="#22c55e" 
                  dot={false}
                  name="Eje Y"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="accel_z" 
                  stroke="#3b82f6" 
                  dot={false}
                  name="Eje Z"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {['X', 'Y', 'Z'].map((axis) => (
            <div key={axis} className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-medium mb-2">Eje {axis}</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Valor actual:</span>
                <span className="text-lg font-bold">
                  {motorData.length > 0 
                    ? motorData[motorData.length - 1][`accel_${axis.toLowerCase()}`].toFixed(2) 
                    : '0.00'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 