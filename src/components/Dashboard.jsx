import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid';
import axios from 'axios';

const Dashboard = () => {
  const [motorData, setMotorData] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('Operación Normal');
  const [isCollecting, setIsCollecting] = useState(false);
  const [modelPrediction, setModelPrediction] = useState(null);
  const [predictionConfidence, setPredictionConfidence] = useState(null);
  const [stateCounts, setStateCounts] = useState({ normal: 0, alerta: 0, falla: 0 });
  const [veredictoFinal, setVeredictoFinal] = useState(null);
  
  const UPDATE_INTERVAL = 2000;
  const API_ENDPOINT = 'http://192.168.100.25:5000';

  const RANGOS = {
    normal: {
      x: { min: 3.15, max: 10.40 },
      y: { min: -8.7, max: 3.15 },
      z: { min: 20.0447926, max: 20.0447926 }
    },
    alerta: {
      x: { min: 2.29, max: 12.1696498 },
      y: { min: -12.8276548, max: 4.0795664 },
      z: { min: 20.0447926, max: 20.0447926 }
    },
    falla: {
      x: { min: -8.7083052, max: 20.0447926 },
      y: { min: -16.4359454, max: 6.864655 },
      z: { min: 18.0834626, max: 20.0447926 }
    }
  };

  // Modificar estas funciones de verificación de rangos
  const enRango = (valor, rango) => {
    return valor >= rango.min && valor <= rango.max;
  };

  // Función para verificar si un valor está dentro de los límites normales
  const estaEnRangoNormal = (valor, eje) => {
    return enRango(valor, RANGOS.normal[eje]);
  };

  // Función para verificar si un valor está en rango de alerta
  const estaEnRangoAlerta = (valor, eje) => {
    return enRango(valor, RANGOS.alerta[eje]) && 
           !enRango(valor, RANGOS.normal[eje]);
  };

  // Función para verificar si un valor está en rango de falla
  const estaEnRangoFalla = (valor, eje) => {
    return enRango(valor, RANGOS.falla[eje]) && 
           !enRango(valor, RANGOS.alerta[eje]);
  };

  const determinarEstado = (datos) => {
    if (!datos || datos.length === 0) {
      return {
        status: 'Operación Normal',
        icon: CheckCircleIcon,
        color: 'text-green-500',
        severity: 0
      };
    }

    const lectura = datos[datos.length - 1];
    
    // Verificar cada eje para falla
    if (
      estaEnRangoFalla(lectura.accel_x, 'x') ||
      estaEnRangoFalla(lectura.accel_y, 'y') ||
      estaEnRangoFalla(lectura.accel_z, 'z')
    ) {
      return {
        status: 'Falla Inminente',
        icon: XCircleIcon,
        color: 'text-red-500',
        severity: 2
      };
    }
    
    // Verificar cada eje para alerta
    if (
      estaEnRangoAlerta(lectura.accel_x, 'x') ||
      estaEnRangoAlerta(lectura.accel_y, 'y') ||
      estaEnRangoAlerta(lectura.accel_z, 'z')
    ) {
      return {
        status: 'Alerta',
        icon: ExclamationTriangleIcon,
        color: 'text-yellow-500',
        severity: 1
      };
    }

    // Si todos los valores están en rango normal
    return {
      status: 'Operación Normal',
      icon: CheckCircleIcon,
      color: 'text-green-500',
      severity: 0
    };
  };


  // Actualizar el contador de estados
  const actualizarContadorEstados = (nuevoEstado) => {
    setStateCounts(prevCounts => ({
      ...prevCounts,
      [nuevoEstado]: prevCounts[nuevoEstado] + 1
    }));
  };

  // Calcular el índice de riesgo
  const calcularIndiceRiesgo = () => {
    const pesos = { normal: 1, alerta: 2, falla: 3 };
    const total = stateCounts.normal + stateCounts.alerta + stateCounts.falla;

    if (total === 0) return 0;

    const indice = (
      (stateCounts.normal * pesos.normal) +
      (stateCounts.alerta * pesos.alerta) +
      (stateCounts.falla * pesos.falla)
    ) / total;

    return indice;
  };

  // Determinar el veredicto final
  const determinarVeredictoFinal = () => {
    const indice = calcularIndiceRiesgo();

    if (indice >= 2.5) {
      return {
        estado: 'Peligro Crítico',
        color: 'text-red-500',
        recomendacion: '¡Detener la licuadora inmediatamente y realizar mantenimiento!'
      };
    } else if (indice >= 1.5) {
      return {
        estado: 'Precaución',
        color: 'text-yellow-500',
        recomendacion: 'Revisar la licuadora y considerar mantenimiento preventivo.'
      };
    } else {
      return {
        estado: 'Buen Estado',
        color: 'text-green-500',
        recomendacion: 'La licuadora está funcionando correctamente.'
      };
    }
  };


  // Función para obtener el color de la barra de vibración
  const getVibrationColor = (value, axis) => {
    if (estaEnRangoFalla(value, axis.toLowerCase())) {
      return 'bg-red-500';
    }
    if (estaEnRangoAlerta(value, axis.toLowerCase())) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  // Efecto para actualizar el estado
  useEffect(() => {
    if (motorData.length > 0) {
      const nuevoEstado = determinarEstado(motorData);
      setCurrentStatus(nuevoEstado.status);
      actualizarContadorEstados(nuevoEstado);
    }
  }, [motorData]);

    // Efecto para calcular el veredicto final
    useEffect(() => {
      if (!isCollecting && (stateCounts.normal + stateCounts.alerta + stateCounts.falla) > 0) {
        setVeredictoFinal(determinarVeredictoFinal());
      }
    }, [isCollecting, stateCounts]);


  const toggleDataCollection = async () => {
    try {
      if (!isCollecting) {
        await axios.get(`${API_ENDPOINT}/start_collection`);
        setIsCollecting(true);
        setModelPrediction(null);
        setPredictionConfidence(null);
      } else {
        const response = await axios.get(`${API_ENDPOINT}/stop_collection`);
        setIsCollecting(false);
        setModelPrediction(response.data.predicted_status);
        setPredictionConfidence(response.data.prediction_proba);
      }
    } catch (error) {
      console.error('Error al controlar la recolección:', error);
    }
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'Operación Normal':
        return {
          description: 'Licuadora funcionando correctamente',
          recommendation: 'Continuar con el uso normal'
        };
      case 'Alerta':
        return {
          description: 'Vibraciones elevadas detectadas',
          recommendation: 'Revisar contenido y ajuste de cuchillas'
        };
      case 'Falla Inminente':
        return {
          description: '¡Niveles críticos de vibración!',
          recommendation: '¡Detener la licuadora inmediatamente!'
        };
      default:
        return {
          description: 'Estado desconocido',
          recommendation: 'Verificar el funcionamiento'
        };
    }
  };

  const ModelPrediction = () => {
    if (!modelPrediction) return null;

    const getPredictionColor = (status) => {
      switch (status) {
        case 'Normal': return 'text-green-500';
        case 'Anómalo': return 'text-yellow-500';
        case 'Falla': return 'text-red-500';
        default: return 'text-gray-500';
      }
    };

    return (
      <div className="mt-6 bg-gray-800 rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-medium mb-4">Predicción del Modelo</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Estado Predicho:</span>
            <span className={`text-lg font-bold ${getPredictionColor(modelPrediction)}`}>
              {modelPrediction}
            </span>
          </div>
          {predictionConfidence && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Nivel de Confianza:</p>
              <div className="grid grid-cols-3 gap-2">
                {['Normal', 'Anómalo', 'Falla'].map((state, index) => (
                  <div key={state} className="bg-gray-700 rounded p-2">
                    <div className="text-sm text-gray-300 mb-1">{state}</div>
                    <div className="font-bold">
                      {(predictionConfidence[0][index] * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const VeredictoFinal = () => {
    if (!veredictoFinal) return null;

    return (
      <div className="mt-6 bg-gray-800 rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-medium mb-4">Veredicto Final</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Estado General:</span>
            <span className={`text-lg font-bold ${veredictoFinal.color}`}>
              {veredictoFinal.estado}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            <p className="font-medium mb-1">Recomendación:</p>
            <p className={veredictoFinal.color}>{veredictoFinal.recomendacion}</p>
          </div>
          <div className="text-sm text-gray-400">
            <p className="font-medium mb-1">Resumen de Estados:</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-700 rounded p-2">
                <div className="text-sm text-gray-300 mb-1">Normal</div>
                <div className="font-bold">{stateCounts.normal}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-sm text-gray-300 mb-1">Alerta</div>
                <div className="font-bold">{stateCounts.alerta}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-sm text-gray-300 mb-1">Falla</div>
                <div className="font-bold">{stateCounts.falla}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let interval;

    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINT}/get_accel_data`);
        const nuevosDatos = {
          timestamp: new Date().toISOString(),
          accel_x: response.data.x,
          accel_y: response.data.y,
          accel_z: response.data.z
        };
    
        setMotorData(prevData => {
          const updatedData = [...prevData, nuevosDatos].slice(-20);
          return updatedData;
        });
      } catch (error) {
        console.error('Error al obtener datos del acelerómetro:', error);
      }
    };
    
    if (isCollecting) {
      fetchData();
      interval = setInterval(fetchData, UPDATE_INTERVAL);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCollecting]);

  const statusInfo = determinarEstado(motorData);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              Monitor Licuadora Oster BLST4655
            </h1>
            <button
              onClick={toggleDataCollection}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isCollecting 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isCollecting ? (
                <>
                  <StopIcon className="h-5 w-5" />
                  Detener Recolección
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5" />
                  Iniciar Recolección
                </>
              )}
            </button>
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
                
                return (
                  <div key={axis} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Vibración Eje {axis}</span>
                      <span className="font-bold">{value.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getVibrationColor(value, axis)} transition-all duration-300`}
                        style={{ 
                          width: `${Math.min((Math.abs(value) / Math.max(
                            RANGOS.falla[axis.toLowerCase()].max,
                            Math.abs(RANGOS.falla[axis.toLowerCase()].min)
                          )) * 100, 100)}%` 
                        }}
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
                  name
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
          <ModelPrediction />
          <VeredictoFinal />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;