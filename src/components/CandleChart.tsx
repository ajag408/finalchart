// Import necessary dependencies from React and Chart.js libraries
import { useEffect, useState, useRef } from 'react';
import '../styles/components/CandleChart.css';
import solanaLogo from '../assets/solana-logo.png';

// Import required Chart.js components and plugins
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';

interface CandleChartProps {
    onPnlChange?: (pnl: number) => void;
    onLevelChange?: (level: number) => void;
  }

  interface TradeMarker {
    size: number;      // Trade size
    price: number;     // Price at which trade occurred
    type: 'buy' | 'sell';  // Type of trade
    timestamp: number;
}
// Register Chart.js components and plugins
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    annotationPlugin
);

export const SOLANA_COLORS = {
    primary: '#14F195',    // Solana's signature green
    secondary: '#9945FF',  // Solana's purple
    dark: '#13141b',      // Dark background
    text: '#E6E6E6',      // Light text
    warning: '#FF3B3B'    // Rug pull red
};

const CandleChart: React.FC<CandleChartProps> = ({ onPnlChange, onLevelChange }) => {
    // ==================== State Management ====================
    
    // Core chart states
    const [data, setData] = useState<any>(null);                      // Holds formatted chart data for Chart.js
    const [countdown, setCountdown] = useState<number>(3);            // Countdown timer before chart starts
    const [isRunning, setIsRunning] = useState<boolean>(true);       // Controls countdown state
    const [isGeneratingCandles, setIsGeneratingCandles] = useState<boolean>(false);  // Controls candle generation
    const [showMoonShot, setShowMoonShot] = useState(false);
    
    // Rug pull related states
    const [rugPulled, setRugPulled] = useState(false);               // Indicates if rug pull occurred
    const [isShowingRugPullMessage, setIsShowingRugPullMessage] = useState(false);   // Controls rug pull message visibility
    const [shakingChart, setShakingChart] = useState(false);         // Controls chart shake animation

    const [currentTrade, setCurrentTrade] = useState<TradeMarker | null>(null);
    // ==================== Refs (Persistent Values) ====================
    
    // Chart data refs
    const completedCandlesRef = useRef<any[]>(new Array(30).fill(null));  // Stores completed candles
    const animationFrameId = useRef<number | undefined>(undefined);        // Stores animation frame ID
    const lastUpdateTime = useRef<number>(Date.now());                     // Tracks last update timestamp
    const candleStartTime = useRef<number>(0);                            // Start time of current candle
    const currentIndexRef = useRef(0);                                    // Current candle index
    
    // Chart scaling refs
    const yAxisMin = useRef<number>(0.5);                                 // Y-axis minimum value
    const yAxisMax = useRef<number>(1.5);                                 // Y-axis maximum value
    
    // Timing and control refs
    const MAX_DURATION_MS = 60 * 1000;                                    // Maximum chart duration (30 seconds)
    const rugPullTimeoutRef = useRef<NodeJS.Timeout | null>(null);               // Stores rug pull timeout
    const startTimeRef = useRef<number>(0);                              // Chart start time
    const countdownRef = useRef<number>(3);                              // Countdown value reference

    // Animation state management
    const animationState = useRef({
        startValue: 1,        // Starting value of current candle
        targetValue: 1,       // Target value for current candle
        currentValue: 1,      // Current animated value
        base: 1              // Base value for current candle
    });

    const tradeMarkersRef = useRef<(TradeMarker | null)[]>(new Array(30).fill(null));

    const chartRef = useRef<any>(null);

        // Add function to simulate trade data

        const simulateTradeMarker = () => {
            const types: ('buy' | 'sell')[] = ['buy', 'sell'];
            const type = types[Math.floor(Math.random() * types.length)];
            const size = (Math.random() * 4.99) + 0.01; // Random size between 0.01 and 5
            
            const newTrade: TradeMarker = {
                size: Number(size.toFixed(2)),
                price: animationState.current.currentValue,
                type: type,
                timestamp: Date.now()
            };
            console.log('Creating new trade:', newTrade);
            // Just store the current trade, don't add to array
            setCurrentTrade(newTrade);
            
            // Force chart update
            setData(createChartData([]));
        };

        const getTradePosition = () => {
            if (!chartRef.current || !currentTrade) return { x: '50%', y: '50%' };
            const chart = chartRef.current;
            const meta = chart.getDatasetMeta(0);
            if (!meta.data[currentIndexRef.current]) return { x: '50%', y: '50%' };
            
            const yScale = chart.scales.y;
            const currentBar = meta.data[currentIndexRef.current];
            
            // Use the bar's actual x position and add a fixed offset
            const xPosition = currentBar.x + (currentBar.width / 2);
            const yPixel = yScale.getPixelForValue(currentTrade.price);
            
            return {
                x: `${(xPosition / chart.width) * 100}%`,
                y: `${(yPixel / chart.height) * 100}%`
            };
        };
    // ==================== Chart Data Creation ====================
    
    /**
     * Creates formatted chart data for Chart.js consumption
     * @param candles - Array of candle data
     * @returns Formatted chart data object
     */
    const createChartData = (candles: any[]) => {
        // Initialize array for visible candles
        const visibleCandles = new Array(30).fill(null);
        
        // Place all completed candles
        completedCandlesRef.current.forEach((candle, index) => {
            if (candle) {
                visibleCandles[index] = candle;
            }
        });
    
        // Add current animating candle
        if (candles[currentIndexRef.current]) {
            visibleCandles[currentIndexRef.current] = candles[currentIndexRef.current];
        }

        const tradeMarkerAnnotations: any = {};
        tradeMarkersRef.current.forEach((trade, index) => {
            if (trade) {
                tradeMarkerAnnotations[`trade${index}`] = {
                    type: 'line',
                    yMin: trade.price - 0.05,  // Make the line longer
                    yMax: trade.price + 0.05,
                    xMin: index,
                    xMax: index,
                    borderColor: trade.type === 'buy' ? SOLANA_COLORS.primary : SOLANA_COLORS.warning,
                    borderWidth: 2,
                    borderDash: [],
                    drawTime: 'afterDatasetsDraw',
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round',
                    shadowBlur: 10,
                    shadowColor: trade.type === 'buy' ? 'rgba(20, 241, 149, 0.5)' : 'rgba(255, 59, 59, 0.5)'
                };
            }
        });
        console.log('Trade markers:', tradeMarkersRef.current);
        console.log('Trade annotations:', tradeMarkerAnnotations);
        // Return formatted data structure for Chart.js
        return {
            labels: Array.from({ length: 30 }, (_, i) => i.toString()),
            datasets: [{
                data: visibleCandles.map((candle) => {
                    if (!candle) return null;
                    return [candle.base, candle.value];
                }),
                backgroundColor: visibleCandles.map((candle) => {
                    if (!candle) return 'transparent';
                    return candle.value >= candle.base ? 
                        `rgba(20, 241, 149, ${rugPulled ? 0.5 : 0.8})` : 
                        `rgba(255, 59, 59, ${rugPulled ? 0.5 : 0.8})`;
                }),
                
                borderColor: visibleCandles.map((candle) => {
                    if (!candle) return 'transparent';
                    return candle.value >= candle.base ? 
                        'rgba(20, 241, 149, 1)' : 
                        'rgba(255, 59, 59, 1)';
                }),
                borderWidth: 2,
                borderRadius: 2,
                
                hoverBackgroundColor: visibleCandles.map((candle) => {
                    if (!candle) return 'transparent';
                    return candle.value >= candle.base ? 
                        'rgba(20, 241, 149, 1)' : 
                        'rgba(255, 59, 59, 1)';
                }),
                hoverBorderColor: SOLANA_COLORS.secondary,
                hoverBorderWidth: 3,
                base: visibleCandles.map((candle) => candle?.base || null),
                barPercentage: 0.8,
                categoryPercentage: 0.8,
                barThickness: 'flex',
                maxBarThickness: 20,
                minBarLength: 2,
            }],
            plugins: {
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: animationState.current.currentValue,
                            yMax: animationState.current.currentValue,
                            borderColor: rugPulled ? SOLANA_COLORS.warning : SOLANA_COLORS.primary,
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: `${animationState.current.currentValue.toFixed(4)}x`,
                                position: window.innerWidth < 768 ? 'start' : 'end', // Change position based on screen width
                                backgroundColor: rugPulled ? 'rgba(255, 59, 59, 0.9)' : 'rgba(20, 241, 149, 0.9)',
                                color: SOLANA_COLORS.dark,
                                font: {
                                    family: "'Orbitron', sans-serif",
                                    size: 14,
                                    weight: 'bold'
                                },
                                padding: {
                                    top: 6,
                                    bottom: 6,
                                    left: 10,
                                    right: 10
                                },
                                borderRadius: 4,
                            }
                        },
                        ...tradeMarkerAnnotations,
                    }
                }
            }
        };
    };

    // ==================== Rug Pull Logic ====================
    
    /**
     * Executes the rug pull animation and state updates
     */
    const executeRugPull = () => {
        // Clear ongoing animations
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = undefined;
        }
        
        // Trigger visual effects
        setShakingChart(true);
        setTimeout(() => setShakingChart(false), 1000);
        
        // Update chart states
        setIsRunning(false);
        setIsGeneratingCandles(false);
        setRugPulled(true);
        setIsShowingRugPullMessage(true);

        // Force current candle to zero
        const currentValue = animationState.current.base;
        animationState.current = {
            ...animationState.current,
            targetValue: 0,
            startValue: currentValue,
            currentValue: 0
        };
        
        // Update chart bounds and data
        yAxisMin.current = 0;
        completedCandlesRef.current[currentIndexRef.current] = {
            value: 0,
            position: currentIndexRef.current,
            base: currentValue
        };
        
        // Update chart display
        setData(createChartData([]));
    };

    // ==================== Chart Reset Logic ====================
    
    /**
     * Resets the chart to initial state
     */
    const resetChart = () => {
        console.log("Resetting chart - Initial countdown value:", countdown);
        
        // Clear existing timeouts and animations
        if (rugPullTimeoutRef.current) {
            clearTimeout(rugPullTimeoutRef.current);
            rugPullTimeoutRef.current = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = undefined;
        }

        // Reset all refs to initial values
        currentIndexRef.current = 0;
        startTimeRef.current = 0;
        candleStartTime.current = 0;
        lastUpdateTime.current = Date.now();
        completedCandlesRef.current = new Array(30).fill(null);
        
        // Reset animation state
        animationState.current = {
            startValue: 1,
            targetValue: 1,
            currentValue: 1,
            base: 1
        };
        
        // Reset axis bounds
        yAxisMin.current = 0.5;
        yAxisMax.current = 1.5;

        // Reset countdown
        countdownRef.current = 3;
        
        tradeMarkersRef.current = new Array(30).fill(null);
        setCurrentTrade(null);

        // Reset all states
        setIsShowingRugPullMessage(false);
        setIsGeneratingCandles(false);
        setRugPulled(false);
        setData(createChartData([]));
        setCountdown(3);
        
        // Start new round
        setTimeout(() => {
            console.log("Starting new round with countdown:", countdownRef.current);
            setIsRunning(true);
        }, 100);
    };

    // ==================== Chart Animation Logic ====================
    
    /**
     * Updates the chart's y-axis bounds based on new values
     */
    const updateAxisBounds = (newValue: number) => {
        if (newValue > yAxisMax.current) {
            yAxisMax.current = Math.ceil(newValue * 2) / 2;
        }
        if (newValue < yAxisMin.current) {
            yAxisMin.current = Math.floor(newValue * 2) / 2;
        }
    };

    /**
     * Initializes a new candle with random target value
     */
    const startNewCandle = () => {
        const currentTime = Date.now();
        // Check if maximum duration reached
        if (currentTime - startTimeRef.current >= MAX_DURATION_MS) {
            setIsGeneratingCandles(false);
            setTimeout(resetChart, 1000);
            return;
        }

        // Calculate new candle parameters
        const prevValue = currentIndexRef.current === 0 ? 1 : animationState.current.targetValue;
        const maxChange = 5;
        const absoluteMax = 100;
        const minPossibleTarget = Math.max(prevValue - maxChange, 0);
        const maxPossibleTarget = Math.min(prevValue + maxChange, absoluteMax);
        
        // Generate random target value within bounds
        const targetValue = minPossibleTarget + (Math.random() * (maxPossibleTarget - minPossibleTarget));
        
        // Update animation state
        animationState.current = {
            startValue: prevValue,
            targetValue: targetValue,
            currentValue: prevValue,
            base: prevValue
        };
        candleStartTime.current = Date.now();
    };

    /**
     * Handles the candle animation frame updates
     */
    const animateCandle = () => {
        if (!isGeneratingCandles || rugPulled) return;

        const currentTime = Date.now();
        const elapsedTime = currentTime - candleStartTime.current;
        const duration = 3000;

        if (elapsedTime >= duration) {
            // Handle completed candle
            const currentIndex = currentIndexRef.current;
            const finalValue = animationState.current.targetValue;
            
            const priceChange = (finalValue - animationState.current.base) / animationState.current.base;
            if (priceChange > 0.05) { // 5% increase
                setShowMoonShot(true);
                setTimeout(() => setShowMoonShot(false), 3000);
            }

            updateAxisBounds(finalValue);
            
            // Store completed candle
            completedCandlesRef.current[currentIndex] = {
                value: finalValue,
                position: currentIndex,
                base: animationState.current.base
            };

            // Update chart
            setData(createChartData([]));

            // Start next candle or reset chart
            if (currentIndex < 29) {
                const nextIndex = currentIndex + 1;
                currentIndexRef.current = nextIndex;
                startNewCandle();
            } else {
                console.log('Reached end of chart');
                setIsGeneratingCandles(false);
                setTimeout(resetChart, 1000);
            }
        } else {
            // Animate current candle
            const progress = elapsedTime / duration;
            const { startValue, targetValue, base } = animationState.current;
            
            // Add noise to animation unless rug pulled
            const noise = rugPulled ? 0 : Math.sin(progress * Math.PI * 8) * 0.05;
            const currentValue = startValue + (targetValue - startValue) * progress + noise;
            
            updateAxisBounds(currentValue);
            animationState.current.currentValue = currentValue;

            // Update current candle data
            const newCandleData = [];
            newCandleData[currentIndexRef.current] = {
                value: currentValue,
                position: currentIndexRef.current,
                base: base
            };
            
            // Update PNL and level only if countdown is finished
            if (countdown === 0 && onPnlChange) {
                onPnlChange((animationState.current.currentValue - 1) * 100);
            }
            if (countdown === 0 && onLevelChange) {
                onLevelChange(Math.floor(animationState.current.currentValue));
            }

            // Update chart
            setData(createChartData(newCandleData));
        }

        // Request next animation frame
        animationFrameId.current = requestAnimationFrame(animateCandle);
    };

    // ==================== Visual Effects ====================
    
    /**
     * Generates background gradient based on chart performance
     */
    const getBackgroundGradient = () => {
        const currentValue = animationState.current.currentValue;
        const startValue = animationState.current.startValue;
        
        if (rugPulled) {
            return 'linear-gradient(to bottom, #13141b, #3d0000)';
        }
        
        if (currentValue > startValue) {
            return 'linear-gradient(to bottom, #13141b, #003d00)';
        }
        
        return 'linear-gradient(to bottom, #13141b, #13141b)';
    };



    // ==================== Effect Hooks ====================
    
    // Initialize chart on mount
    useEffect(() => {
        resetChart();
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, []);

    // Handle countdown animation
    useEffect(() => {
        if (!isRunning) return;
        
        console.log("Countdown started with value:", countdownRef.current);
        lastUpdateTime.current = Date.now();

        const updateCountdown = () => {
            const currentTime = Date.now();
            const deltaTime = (currentTime - lastUpdateTime.current) / 1000;
            lastUpdateTime.current = currentTime;

            setCountdown((prev) => {
                const newCountdown = prev - deltaTime;
                countdownRef.current = newCountdown;
                if (newCountdown <= 0) {
                    requestAnimationFrame(() => {
                        setIsRunning(false);
                        setCountdown(0);
                        countdownRef.current = 0;
                        setIsGeneratingCandles(true);
                    });
                    return 0;
                }
                return newCountdown;
            });

            if (countdownRef.current > 0) {
                requestAnimationFrame(updateCountdown);
            }
        };

        const animationId = requestAnimationFrame(updateCountdown);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isRunning]);

    // Start candle generation after countdown
    useEffect(() => {
        if (countdown === 0 && !isGeneratingCandles && !rugPulled) {
            setIsGeneratingCandles(true);
        }
    }, [countdown, rugPulled]);

    // Handle candle generation and rug pull timing
    useEffect(() => {
        if (isGeneratingCandles) {
            startTimeRef.current = Date.now();
            startNewCandle();
            animateCandle();

            // Set random rug pull timing
            const rugPullDelay = Math.random() * MAX_DURATION_MS;
            rugPullTimeoutRef.current = setTimeout(executeRugPull, rugPullDelay);

            // Set maximum duration timeout
            const maxDurationTimeout = setTimeout(() => {
                setIsGeneratingCandles(false);
                setTimeout(resetChart, 1000);
            }, MAX_DURATION_MS);

            return () => {
                if (rugPullTimeoutRef.current) clearTimeout(rugPullTimeoutRef.current);
                clearTimeout(maxDurationTimeout);
                if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            };
        }
    }, [isGeneratingCandles]);

    // Handle rug pull message timing
    useEffect(() => {
        if (isShowingRugPullMessage) {
            const timer = setTimeout(() => {
                setIsShowingRugPullMessage(false);
                lastUpdateTime.current = Date.now();
                resetChart();
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [isShowingRugPullMessage]);

    useEffect(() => {
        // Set initial PNL to 0
        if (onPnlChange) {
            onPnlChange(0);
        }
    }, []); // Run once on mount

    useEffect(() => {
        if (isGeneratingCandles && !rugPulled) {
            const tradeInterval = setInterval(() => {
                simulateTradeMarker();
            }, 1000); // Simulate trade every second

            return () => clearInterval(tradeInterval);
        }
    }, [isGeneratingCandles, rugPulled]);
    // ==================== Chart Configuration ====================
    
    // Chart.js options configuration
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0,
        },
        scales: {
            y: {
                position: 'left',
                ticks: {
                    callback: (value: number) => `${value.toFixed(1)}x`,
                    color: SOLANA_COLORS.text,
                    font: {
                        size: 11,
                        family: "'Orbitron', sans-serif",
                        weight: 'bold'
                    },
                    // Add padding for better readability
                    padding: 8,
                    // Add glow effect to ticks
                    textStrokeWidth: 1,
                    textStrokeColor: 'rgba(C20, 241, 149, 0.2)',
                },
                min: yAxisMin.current,
                max: yAxisMax.current,
                grid: {
                    color: (context: { tick: {value: number} }) => {
                        const value = context.tick.value;
                        // Make grid lines more prominent near current value
                        const distance = Math.abs(value - animationState.current.currentValue);
                        const alpha = Math.max(0.1, 0.3 - distance * 0.1);
                        return `rgba(20, 241, 149, ${alpha})`;
                    },
                    lineWidth: (context: { tick: { value: number } }) => {
                        return context.tick.value === 1 ? 2 : 1; // Make the 1x line thicker
                    },
                    borderDash: [5, 5],
                    drawBorder: false,
                },
                // Add transition for smooth updates
                transition: 'all 0.3s ease',
            },
            x: {
                // Add these configurations
                min: 0,
                max: 29,
                ticks: {
                    display: false
                },
                grid: {
                    display: false
                },
                // // This is important for mobile
                // offset: true,
                // // These ensure consistent bar width
                // afterFit: (scale: { paddingRight: number; paddingLeft: number }) => {
                //     scale.paddingRight = 20;
                //     scale.paddingLeft = 20;
                // },
                // This is important for mobile
                offset: true,
            },
        },
        elements: {
            bar: {
                borderWidth: 2,
                borderRadius: 2
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: false
            },
            annotation: {
                common: {
                    drawTime: 'afterDatasetsDraw'
                },
                annotations: {
                    line1: {
                        type: 'line',
                        yMin: animationState.current.currentValue,
                        yMax: animationState.current.currentValue,
                        borderColor: rugPulled ? SOLANA_COLORS.warning : SOLANA_COLORS.primary,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        // Add glow effect
                        shadowBlur: 10,
                        shadowColor: rugPulled ? 'rgba(255, 59, 59, 0.5)' : 'rgba(20, 241, 149, 0.5)',
                        label: {
                            display: true,
                            content: `${animationState.current.currentValue.toFixed(4)}x`,
                            position: 'end',
                            backgroundColor: rugPulled ? 'rgba(255, 59, 59, 0.9)' : 'rgba(20, 241, 149, 0.9)',
                            color: SOLANA_COLORS.dark,
                            font: {
                                family: "'Orbitron', sans-serif",
                                size: 14,
                                weight: 'bold'
                            },
                            padding: {
                                top: 6,
                                bottom: 6,
                                left: 10,
                                right: 10
                            },
                            borderRadius: 4,
                            textAlign: 'center',
                            // Add glow effect to label
                            shadowBlur: 10,
                            shadowColor: rugPulled ? 'rgba(255, 59, 59, 0.5)' : 'rgba(20, 241, 149, 0.5)',
                            borderWidth: 1,
                            borderColor: rugPulled ? SOLANA_COLORS.warning : SOLANA_COLORS.primary,
                            textShadow: `0 0 10px ${rugPulled ? 'rgba(255, 59, 59, 0.7)' : 'rgba(20, 241, 149, 0.7)'}`,
                            animation: 'pulse 2s infinite',
                        }
                    },
                    // Add background gradient zone
                    gradient1: {
                        type: 'box',
                        xMin: 0,
                        xMax: 100,
                        yMin: yAxisMin.current,
                        yMax: yAxisMax.current,
                        backgroundColor: 'rgba(20, 241, 149, 0.02)',
                        borderWidth: 0,
                        drawTime: 'beforeDatasetsDraw',
                    },
                    ...(currentTrade ? {
                        // tradeLabel: {
                        //     type: 'label',
                        //     xValue: currentIndexRef.current,
                        //     yValue: currentTrade.price,
                        //     content: [`${currentTrade.type === 'buy' ? 'Buy' : 'Sell'} ${currentTrade.size.toFixed(3)}`],
                        //     position: currentTrade.type === 'buy' ? 'top' : 'bottom',
                        //     yAdjust: currentTrade.type === 'buy' ? -20 : 20,
                        //     color: SOLANA_COLORS.dark,
                        //     font: {
                        //         family: "'Orbitron', sans-serif",
                        //         size: 11,
                        //         weight: 'bold'
                        //     },
                        //     backgroundColor: currentTrade.type === 'buy' ? 'rgba(20, 241, 149, 0.9)' : 'rgba(255, 59, 59, 0.9)',
                        //     padding: 8,
                        //     borderRadius: 4,
                        //     shadowBlur: 10,
                        //     shadowColor: currentTrade.type === 'buy' ? 'rgba(20, 241, 149, 0.5)' : 'rgba(255, 59, 59, 0.5)'
                        // }
                    } : {})
                }
            }
        }
    };

    // ==================== Render ====================
    return (
        <div style={{ 
            position: 'relative', 
            height: '400px', 
            width: '100%',
            minWidth: '320px',
            backgroundColor: SOLANA_COLORS.dark,
            borderRadius: '8px',
            padding: '20px',
            animation: `${shakingChart ? 'rugPullShake 0.5s infinite' : 'glow 2s infinite'}`,
            background: getBackgroundGradient(),
            transition: 'all 0.5s ease',
            border: `1px solid ${rugPulled ? SOLANA_COLORS.warning : SOLANA_COLORS.primary}`,
            boxShadow: `0 0 20px ${rugPulled ? 'rgba(255, 59, 59, 0.2)' : 'rgba(20, 241, 149, 0.2)'}`,
        }}>

        <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backdropFilter: 'blur(4px)',
                    border: `1px solid ${SOLANA_COLORS.primary}`,
                    fontFamily: "'Orbitron', sans-serif",
                    zIndex: 10,
                    fontSize: '12px', // Smaller base font size
                    }}>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: animationState.current.currentValue >= 1 ? SOLANA_COLORS.primary : SOLANA_COLORS.warning,
                    }}>
                        {((animationState.current.currentValue - 1) * 100).toFixed(2)}%
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: '#888',
                    }}>
                        SOL
                    </span>
            </div>

            {/* Moon shot effect and message */}
            {showMoonShot && (
                <>
                    {/* Rocket and stars */}
                    <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', borderRadius: '8px' }}>
                        <div 
                            className="moon-rocket"
                            style={{
                                bottom: '20%',
                                left: '50%',
                            }}
                        >
                            🚀
                        </div>
                        
                        {Array.from({ length: 20 }, (_, i) => (
                            <div
                                key={i}
                                className="star"
                                style={{
                                    left: `${Math.random() * 90}%`,
                                    top: `${Math.random() * 90}%`,
                                    animationDelay: `${Math.random() * 1}s`,
                                    transform: 'translateX(-5%)'
                                }}
                            >
                                ✨
                            </div>
                        ))}
                    </div>

                    {/* Celebratory message */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: SOLANA_COLORS.primary,
                        fontSize: '32px',
                        fontWeight: 'bold',
                        fontFamily: "'Orbitron', sans-serif",
                        textShadow: '0 0 10px rgba(20, 241, 149, 0.7)',
                        zIndex: 11,
                        textAlign: 'center',
                        animation: 'moonShot 3s forwards',
                        pointerEvents: 'none',
                    }}>
                        TO THE MOON! 🌕
                    </div>
                </>
            )}

            {currentTrade && (
                <div style={{
                    position: 'absolute',
                    top: getTradePosition().y,
                    left: getTradePosition().x,
                    transform: 'translate(0, -50%)',
                    marginLeft: '-17px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${currentTrade.type === 'buy' ? 'rgba(20, 241, 149, 0.3)' : 'rgba(255, 59, 59, 0.3)'}`,
                    boxShadow: `0 0 10px ${currentTrade.type === 'buy' ? 'rgba(20, 241, 149, 0.1)' : 'rgba(255, 59, 59, 0.1)'}`,
                }}>
                    <img 
                        src={solanaLogo} 
                        alt="Solana"
                        style={{
                            width: '20px',
                            height: '20px',
                            filter: currentTrade.type === 'buy' ? 
                                'drop-shadow(0 0 5px rgba(20, 241, 149, 0.7))' : 
                                'drop-shadow(0 0 5px rgba(255, 59, 59, 0.7))'
                        }}
                    />
                    <span style={{
                        color: currentTrade.type === 'buy' ? SOLANA_COLORS.primary : SOLANA_COLORS.warning,
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textShadow: `0 0 10px ${currentTrade.type === 'buy' ? 'rgba(20, 241, 149, 0.7)' : 'rgba(255, 59, 59, 0.7)'}`,
                    }}>
                        {`${currentTrade.type === 'buy' ? 'Buy' : 'Sell'} ${currentTrade.size.toFixed(3)}`}
                    </span>
                </div>
            )}

            {/* Trade notification */}
            {/* {currentTrade && (
                <div
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: currentTrade.type === 'buy' ? 'rgba(20, 241, 149, 0.2)' : 'rgba(255, 59, 59, 0.2)',
                        border: `1px solid ${currentTrade.type === 'buy' ? SOLANA_COLORS.primary : SOLANA_COLORS.warning}`,
                        borderRadius: '4px',
                        padding: '8px',
                        color: SOLANA_COLORS.text,
                        fontSize: '12px',
                        fontFamily: "'Orbitron', sans-serif",
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeInOut 1s forwards',
                        zIndex: 100
                    }}
                >
                    {currentTrade.type.toUpperCase()} {currentTrade.size.toLocaleString()} GLOSS @ {currentTrade.price.toFixed(3)}x
                </div>
            )} */}


                {/* Chart wrapper */}
    <div style={{ 
        position: 'relative',  // Changed to relative
        height: '100%',       // Added height
        width: '100%',        // Added width
    }}>
            {/* Render Chart */}
            {data && <Bar ref={chartRef} data={data} options={options as any} style={{
                            filter: rugPulled ? 'contrast(1.2) brightness(0.8)' : 'none',
                transition: 'all 0.3s ease',
            }} />}
    </div>
            
            {/* Render Countdown */}
            {countdownRef.current > 0 && (
                <div className="countdown-container" style={{
                    animation: countdownRef.current <= 3 ? 'pulse 0.5s infinite' : 'none',
                }}>
                    <div style={{ 
                        fontSize: '20px', 
                        marginBottom: '10px',
                        whiteSpace: 'nowrap',  
                        letterSpacing: '1px',
                    }}>
                        Next Round In:
                    </div>
                    <div style={{ 
                        fontSize: '48px', 
                        fontWeight: 'bold',
                        lineHeight: 1,  
                        letterSpacing: '2px',
                    }}>
                        {countdownRef.current.toFixed(1)}s
                    </div>
                </div>
            )}
            
            {/* Render Rug Pull Overlay */}
            {rugPulled && (
                <>
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    animation: 'fadeIn 0.3s ease-in'
                }} />
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#ff0000',
                    fontSize: '64px',
                    fontWeight: 'bold',
                    fontFamily: "'Orbitron', sans-serif",
                    textShadow: '0 0 20px rgba(255, 0, 0, 0.7)',
                    animation: 'dropIn 0.5s ease-out',
                    zIndex: 100,
                    textAlign: 'center',
                    letterSpacing: '4px'
                }}>
                    RUG PULLED!
                </div>
                </>
            )}


        </div>
    );
};

export default CandleChart;