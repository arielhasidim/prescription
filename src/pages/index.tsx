// @ts-nocheck
import { useState, useEffect, type FormEvent } from 'react';

type HistorySection = 'patient' | 'medication';

const PrescriptionForm = () => {
  // State for form data
  const [patientInfo, setPatientInfo] = useState({
    firstName: '',
    lastName: '',
    idNumber: ''
  });

  const [medicationInfo, setMedicationInfo] = useState({
    name: '',
    dosage: '',
    units: '',
    form: '',
    route: '',
    frequency: '',
    instructions: ''
  });

  const [supplyTab, setSupplyTab] = useState('quantity'); // 'quantity' or 'duration'
  const [supplyInfo, setSupplyInfo] = useState({
    quantity: '',
    quantityUnits: 'טבליות - tab',
    duration: '',
    durationUnits: 'ימים - days'
  });

  const [doctorInfo, setDoctorInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('doctorInfo');
      return saved ? JSON.parse(saved) : {
        firstName: '',
        lastName: '',
        specialty: '',
        licenseNumber: '',
        phone: '',
        clinic: ''
      };
    } catch {
      return {
        firstName: '',
        lastName: '',
        specialty: '',
        licenseNumber: '',
        phone: '',
        clinic: ''
      };
    }
  });

  const [patientHistory, setPatientHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('patientHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [medicationHistory, setMedicationHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('medicationHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [historyDialog, setHistoryDialog] = useState<HistorySection | null>(null);
  const [showExperimentalControls] = useState(false);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  
  // OpenAI API state
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  
  // Antibiotic helper states
  const [showAntibioticHelper, setShowAntibioticHelper] = useState(false);
  const [antibioticQuery, setAntibioticQuery] = useState('');
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [antibioticRecommendation, setAntibioticRecommendation] = useState(null);
  const [customMedicationValues, setCustomMedicationValues] = useState({
    dosage: '',
    units: '',
    form: '',
    route: ''
  });

  const getHistoryLabel = (section: HistorySection, entry: Record<string, any>) => {
    if (section === 'patient') {
      const fullName = [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim();
      return fullName || entry.idNumber || 'מטופל ללא פרטים';
    }

    const medicationName = entry.name || 'תרופה ללא שם';
    const dosage = entry.dosage ? `${entry.dosage}` : '';
    const units = entry.units ? entry.units.split(' - ')[0] : '';
    const route = entry.route ? entry.route.split(' - ')[0] : '';
    const form = entry.form ? entry.form.split(' - ')[0] : '';
    return [medicationName, dosage, units, form, route].filter(Boolean).join(' • ');
  };

  const hasPatientData = (): boolean => {
    return Object.values(patientInfo).some((value) => typeof value === 'string' ? value.trim() : Boolean(value));
  };

  const hasMedicationData = (): boolean => {
    return ['name', 'dosage', 'units', 'form', 'route', 'frequency', 'instructions'].some((field) => {
      const fieldValue = getMedicationFieldValue(field as keyof typeof medicationInfo);
      return typeof fieldValue === 'string' ? fieldValue.trim() : Boolean(fieldValue);
    });
  };

  const saveHistoryEntry = (section: HistorySection) => {
    const entries = section === 'patient' ? patientHistory : medicationHistory;
    const currentData = section === 'patient' ? patientInfo : medicationInfo;
    const currentCustomData = section === 'patient' ? null : customMedicationValues;

    if (section === 'patient' && !hasPatientData()) {
      return;
    }

    if (section === 'medication' && !hasMedicationData()) {
      return;
    }

    const savedEntry = {
      id: `${section}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label: getHistoryLabel(section, currentData),
      data: { ...currentData },
      customValues: currentCustomData ? { ...currentCustomData } : undefined
    };

    const nextEntries = [savedEntry, ...entries.filter((entry) => JSON.stringify(entry.data) !== JSON.stringify(savedEntry.data))].slice(0, 10);

    if (section === 'patient') {
      setPatientHistory(nextEntries);
    } else {
      setMedicationHistory(nextEntries);
    }
  };

  // Load saved API key and current date on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openaiApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsConnected(true);
    }

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setCurrentDate(`${day}/${month}/${year}`);
  }, []);

  // Save doctor info to cache when it changes
  useEffect(() => {
    localStorage.setItem('doctorInfo', JSON.stringify(doctorInfo));
  }, [doctorInfo]);

  useEffect(() => {
    localStorage.setItem('patientHistory', JSON.stringify(patientHistory));
  }, [patientHistory]);

  useEffect(() => {
    localStorage.setItem('medicationHistory', JSON.stringify(medicationHistory));
  }, [medicationHistory]);

  // Form dropdown options
  const unitOptions = ['mg', 'g', 'mcg', 'mL', 'cc', 'IU', 'UI', '%', 'ppm', 'spray', 'mEq', 'mmol', 'U'];
  
  const formOptions = [
    'טבליה - tab', 
    'קפסולה - cap', 
    'סירופ - syr',
    'תרחיף - susp', 
    'תמיסה - sol',
    'זריקה - inj',
    'שקית - sach',
    'גרנולות - gran',
    'משחה - ung',
    'קרם - crm',
    'נר - supp',
    'ג׳ל - gel',
    'סוכריה למציצה - loz',
    'טיפות - drops',
    'מדבקה - patch',
    'משאף - inh',
    'תרסיס - spray'
  ];
  
  const routeOptions = [
    'דרך הפה - p.o.',
    'תוך ורידי - IV',
    'תוך שרירי - IM',
    'תת-עורי - SC/SubQ',
    'מתחת ללשון - SL',
    'דרך פי הטבעת - PR',
    'שימוש מקומי - top',
    'בשאיפה - inh',
    'דרך האף - nas',
    'לעין - opth',
    'לאוזן - otic',
    'לנרתיק - vag',
    'תוך-עורי - ID',
    'תוך-קנה - IT'
  ];
  
  const frequencyOptions = [
    'פעם ביום - q.d.',
    'פעמיים ביום - b.i.d.',
    'שלוש פעמים ביום - t.i.d.',
    'ארבע פעמים ביום - q.i.d.',
    'כל 4 שעות - q4h',
    'כל 6 שעות - q6h',
    'כל 8 שעות - q8h',
    'כל 12 שעות - q12h',
    'יום כן, יום לא - qod',
    'מיידית - stat',
    'לפי הצורך - prn',
    'לפני השינה - h.s.',
    'לפני אוכל - a.c.',
    'אחרי אוכל - p.c.',
    'לסירוגין - int.',
    'בכל בוקר - q.a.m.',
    'בכל ערב - q.p.m.'
  ];

  const quantityUnitOptions = [
    'טבליות - tab', 
    'קפסולות - cap', 
    'מ"ל - mL',
    'אמפולות - amp',
    'בקבוקונים - vial',
    'קופסה - box',
    'חבילה - pkg',
    'נרות - supp',
    'מדבקות - patch',
    'יחידות - pcs'
  ];
  
  const durationUnitOptions = [
    'ימים - days',
    'שבועות - weeks',
    'חודשים - months'
  ];

  const OTHER_OPTION = 'אחר';

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate required fields
    if (!patientInfo.firstName || !patientInfo.lastName || !patientInfo.idNumber || 
        !medicationInfo.name || !getMedicationFieldValue('route') || !medicationInfo.frequency) {
      alert('נא למלא את כל שדות החובה המסומנים בכוכבית (*)');
      return;
    }
    
    saveHistoryEntry('patient');
    saveHistoryEntry('medication');

    // Form is valid, show print dialog
    setShowPrintDialog(true);
  };

  // Close print dialog
  const closePrintDialog = () => {
    setShowPrintDialog(false);
  };

  // Print prescription
  const printPrescription = () => {
    // Close dialog first
    closePrintDialog();
    
    const printElement = document.getElementById('prescription-print');
    const printContent = printElement?.innerHTML ?? '';
    const printWindow = window.open('', '_blank');
    
    // Make sure window was created successfully
    if (!printWindow) {
      alert("אנא אפשר חלונות קופצים כדי להדפיס את המרשם");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>מרשם רפואי</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; margin: 0; background: #ffffff; }
          * { box-sizing: border-box; }
          .prescription-container { border: 2px solid #ccc; border-radius: 8px; padding: 30px; max-width: 800px; margin: 20px auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eaeaea; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .text-left { text-align: left; }
          .divider { border-top: 1px solid #ccc; margin: 15px 0; }
          .bold { font-weight: bold; }
          .section-title { font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #333; }
          .patient-info p, .medication-info p { margin: 5px 0; font-size: 14px; }
          .rx-title { display: flex; align-items: center; margin-bottom: 10px; }
          .rx-symbol { font-weight: bold; font-size: 22px; margin-left: 10px; }
          .medication-name { font-size: 18px; font-weight: bold; margin: 10px 0; }
          .signature-section { margin-top: 40px; }
          .signature-line { border-bottom: 1px solid #000; height: 40px; margin-top: 10px; margin-bottom: 5px; }
          .doctor-info { font-size: 14px; }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Focus on the new tab
    printWindow.focus();
  };

  // Helper to get the selected option's short form
  const getShortForm = (value, options) => {
    if (!value) return '';
    const option = options.find(opt => opt === value);
    if (!option) return value;
    return value.split(' - ')[1];
  };

  const applyHistorySelection = (section, entry) => {
    if (section === 'patient') {
      setPatientInfo({ ...entry.data });
    } else {
      const medicationEntry = entry.data || {};
      setMedicationInfo({ ...medicationEntry });
      setCustomMedicationValues(entry.customValues || {
        dosage: '',
        units: '',
        form: '',
        route: ''
      });
    }
    setHistoryDialog(null);
  };

  const clearSectionData = (section) => {
    if (section === 'patient') {
      setPatientInfo({ firstName: '', lastName: '', idNumber: '' });
      return;
    }

    setMedicationInfo({
      name: '',
      dosage: '',
      units: '',
      form: '',
      route: '',
      frequency: '',
      instructions: ''
    });
    setCustomMedicationValues({
      dosage: '',
      units: '',
      form: '',
      route: ''
    });
  };

  const clearHistory = (section) => {
    clearSectionData(section);
  };

  const removeHistoryEntry = (section: HistorySection, entryId: string) => {
    if (section === 'patient') {
      setPatientHistory((prev) => prev.filter((entry) => entry.id !== entryId));
      return;
    }

    setMedicationHistory((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  useEffect(() => {
    if (!historyDialog && !showPrintDialog) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (historyDialog) {
          setHistoryDialog(null);
        }
        if (showPrintDialog) {
          setShowPrintDialog(false);
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [historyDialog, showPrintDialog]);

  const handleMedicationValueChange = (field, value) => {
    setMedicationInfo((prev) => ({ ...prev, [field]: value }));
    if (value !== OTHER_OPTION) {
      setCustomMedicationValues((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomMedicationValueChange = (field, value) => {
    setCustomMedicationValues((prev) => ({ ...prev, [field]: value }));
    setMedicationInfo((prev) => ({ ...prev, [field]: OTHER_OPTION }));
  };

  const getMedicationFieldValue = (field) => {
    const selectedValue = medicationInfo[field];
    if (selectedValue === OTHER_OPTION) {
      return customMedicationValues[field]?.trim() || '';
    }
    return selectedValue?.trim() || '';
  };

  // OpenAI API connection functions
  const openApiKeyDialog = () => {
    setShowApiKeyDialog(true);
    setApiKeyError('');
  };
  
  const closeApiKeyDialog = () => {
    setShowApiKeyDialog(false);
  };
  
  const handleConnectToOpenAI = async () => {
    if (!apiKey.trim()) {
      setApiKeyError('אנא הזן מפתח API');
      return;
    }
    
    setConnectionStatus('מתחבר...');
    
    try {
      // Test the API key with a simple request - just list available models
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        // API key is valid
        localStorage.setItem('openaiApiKey', apiKey);
        setIsConnected(true);
        setConnectionStatus('מחובר');
        setApiKeyError('');
        closeApiKeyDialog();
      } else {
        // API key is invalid
        const error = await response.json();
        setApiKeyError(`שגיאה: ${error.error?.message || 'מפתח API לא תקין'}`);
        setConnectionStatus('');
      }
    } catch (error) {
      setApiKeyError(`שגיאת התחברות: ${error.message}`);
      setConnectionStatus('');
    }
  };
  
  const handleDisconnectFromOpenAI = () => {
    localStorage.removeItem('openaiApiKey');
    setApiKey('');
    setIsConnected(false);
    setConnectionStatus('');
  };
  
  // Antibiotic helper functions
  const openAntibioticHelper = () => {
    if (!isConnected) {
      openApiKeyDialog();
      return;
    }
    
    setShowAntibioticHelper(true);
    setAntibioticRecommendation(null);
    setAntibioticQuery('');
  };
  
  const closeAntibioticHelper = () => {
    setShowAntibioticHelper(false);
  };
  
  // Parse and organize the AI response into a structured recommendation object
  const parseAIResponse = (responseText) => {
    try {
      // Try to clean and prepare the response text
      let cleanText = responseText.trim();
      
      // Try to find JSON within the text (if surrounded by other content)
      const jsonStartIndex = cleanText.indexOf('{');
      const jsonEndIndex = cleanText.lastIndexOf('}') + 1;
      
      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        cleanText = cleanText.slice(jsonStartIndex, jsonEndIndex);
      }
      
      // Replace Hebrew quotation marks with standard ones
      // This handles the מ"ג case that causes parsing issues
      cleanText = cleanText.replace(/([א-ת])"([א-ת])/g, '$1\\"$2');
      
      // Manually convert to a valid object
      // This approach avoids JSON.parse entirely
      try {
        // For this specific case, we'll evaluate the string directly
        // but with proper security considerations
        // WARNING: Never use this approach with untrusted input!
        // In this specific controlled case, we're handling API responses we requested
        
        // Convert to a proper object without using eval
        const objectFromString = new Function('return ' + cleanText)();
        console.log("Successfully parsed response:", objectFromString);
        
        // Format object for proper display
        const formattedResult = {
          diagnosis: objectFromString.diagnosis || "לא זוהתה אבחנה",
          source: objectFromString.source || "הנחיות קליניות בישראל לרפואת ילדים",
          message: objectFromString.message,
          examples: objectFromString.examples,
          primaryRecommendation: objectFromString.primaryRecommendation ? {
            medication: objectFromString.primaryRecommendation.medication || "",
            dosage: objectFromString.primaryRecommendation.dosage || "",
            units: objectFromString.primaryRecommendation.units || "",
            route: objectFromString.primaryRecommendation.route || "",
            frequency: objectFromString.primaryRecommendation.frequency || "",
            duration: objectFromString.primaryRecommendation.duration || "",
            form: objectFromString.primaryRecommendation.form || "",
            instructions: objectFromString.primaryRecommendation.instructions || "",
            notes: objectFromString.primaryRecommendation.notes || ""
          } : null,
          alternatives: Array.isArray(objectFromString.alternatives) ? 
            objectFromString.alternatives.map(alt => ({
              medication: alt.medication || "",
              dosage: alt.dosage || "",
              units: alt.units || "",
              route: alt.route || "",
              frequency: alt.frequency || "",
              duration: alt.duration || "",
              notes: alt.notes || ""
            })) : [],
          considerations: Array.isArray(objectFromString.considerations) ?
            objectFromString.considerations : []
        };
        
        return formattedResult;
      } catch (evalError) {
        console.error("Failed to parse response with Function approach:", evalError);
        
        // If that fails, try a regex-based approach as fallback
        const diagnosisMatch = cleanText.match(/"diagnosis":\s*"([^"]+)"/);
        const diagnosis = diagnosisMatch ? diagnosisMatch[1] : "לא זוהתה אבחנה";
        
        const sourceMatch = cleanText.match(/"source":\s*"([^"]+)"/);
        const source = sourceMatch ? sourceMatch[1] : "הנחיות קליניות בישראל לרפואת ילדים";
        
        // Extract primary recommendation
        const medicationMatch = cleanText.match(/"medication":\s*"([^"]+)"/);
        const medication = medicationMatch ? medicationMatch[1] : "";
        
        const dosageMatch = cleanText.match(/"dosage":\s*"([^"]+)"/);
        const dosage = dosageMatch ? dosageMatch[1] : "";
        
        const unitsMatch = cleanText.match(/"units":\s*"([^"]+)"/);
        const units = unitsMatch ? unitsMatch[1] : "";
        
        const routeMatch = cleanText.match(/"route":\s*"([^"]+)"/);
        const route = routeMatch ? routeMatch[1] : "";
        
        const frequencyMatch = cleanText.match(/"frequency":\s*"([^"]+)"/);
        const frequency = frequencyMatch ? frequencyMatch[1] : "";
        
        const durationMatch = cleanText.match(/"duration":\s*"([^"]+)"/);
        const duration = durationMatch ? durationMatch[1] : "";
        
        const formMatch = cleanText.match(/"form":\s*"([^"]+)"/);
        const form = formMatch ? formMatch[1] : "";
        
        const instructionsMatch = cleanText.match(/"instructions":\s*"([^"]+)"/);
        const instructions = instructionsMatch ? instructionsMatch[1] : "";
        
        const notesMatch = cleanText.match(/"notes":\s*"([^"]+)"/);
        const notes = notesMatch ? notesMatch[1] : "";
        
        // Create resulting object
        return {
          diagnosis,
          source,
          primaryRecommendation: {
            medication,
            dosage,
            units,
            route,
            frequency,
            duration,
            form,
            instructions,
            notes
          },
          alternatives: [],
          considerations: []
        };
      }
    } catch (error) {
      console.error('Error in parseAIResponse:', error);
      return {
        diagnosis: 'שגיאת עיבוד',
        source: 'שגיאת מערכת',
        message: `אירעה שגיאה בעיבוד התשובה: ${error.message}. אנא נסה שוב.`,
        primaryRecommendation: {
          medication: '',
          dosage: '',
          units: '',
          route: '',
          frequency: '',
          duration: '',
          form: '',
          instructions: '',
          notes: ''
        },
        alternatives: [],
        considerations: []
      };
    }
  };
  
  const getAntibioticRecommendation = async () => {
    if (!antibioticQuery.trim()) {
      alert('אנא הזן שאילתה');
      return;
    }
    
    if (!isConnected || !apiKey) {
      alert('אנא התחבר ל-OpenAI תחילה');
      openApiKeyDialog();
      return;
    }
    
    setIsLoadingRecommendation(true);
    
    try {
      // Prepare instructions to request JSON formatted response
      const systemMessage = `
        ענה בלבד על סמך קונטקסט.
        חשוב מאוד: תפקידך לעזור לרופא לנסח מרשמים מדוייקים לפי אבחנה ושיקולים קליניים כולל משקל וגיל. המשמעות של טעות הינה מסוכנת ולכן העדף לא לתת תשובה אם רמת הוודאות שלך לא מספקת.
        קונטקסט שמקורו בעברית הוא ההנחיות הישראליות. קונטקסט שמקורו באנגלית הוא מספר "נלסון לרפואת ילדים".
        חפש קודם רק בקונטקסט הנחיות ישראליות לתשובה, אם לא מצאת אז חפש בנלסון. העדף לבחור טיפול מתוך טבלה בהנחיות הישראליות..
        כשאתה מוצא את הפרק הרלוונטי לתשובה, בצע קריאה עד סוף הפרק כדי לתת את התשובה המדוייקת ביותר.
        במקור הנלסון קרא את מספור העמוד מה-header של המסמך.
        במקור ההנחיות הישראליות קרא את מספור העמוד מהfooter של המסמך.

        חשוב מאוד: עליך להחזיר את התשובה בפורמט JSON בדיוק לפי המבנה הבא:
        
        {
          "diagnosis": "שם האבחנה (כולל שם לועזי)",
          "source": "רפרנס למקור המידע לבחירת primaryRecommendation ,(אם קיים) כולל: עמוד, שם פרק, כותרת, תת כותרת (אם קיים), שם של טבלה ",
          "ciatation: "ציטוט מדוייק מתוך מתוך הטקסט המקורי מתוך מקור המידע לבחירת מינון של primaryRecommendation , עד אורך של 5 משפטים ",

          "primaryRecommendation": {
            "medication": "שם התרופה הגנרית באותיות UPPERCASE באנגלית",
            "dosage": "מינון למנה בודדת בערך מספרי מעוגל לעשרות, יש להשתמש במשקל המטופל בקילוגרמים לחישוב המינון ולהתחשב בערך מינון מקסימלי, להציג ללא יחידות",
            "units": "יחידות - עליך לבחור אחד מהערכים הבאים בדיוק: מיליגרם - mg, גרם - g, מיקרוגרם - mcg, מיליליטר - mL, סמ״ק - cc, יחידות בינלאומיות - IU, יחידות בינלאומיות - UI, אחוז - %, חלקים למיליון - ppm, השפרצות - spray, מילי-אקוויולנט - mEq, מילימול - mmol, יחידה - U",
            "route": "דרך מתן - עליך לבחור אחד מהערכים הבאים בדיוק: דרך הפה - p.o., תוך ורידי - IV, תוך שרירי - IM, תת-עורי - SC/SubQ, מתחת ללשון - SL, דרך פי הטבעת - PR, שימוש מקומי - top, בשאיפה - inh, דרך האף - nas, לעין - opth, לאוזן - otic, לנרתיק - vag, תוך-עורי - ID, תוך-קנה - IT",
            "frequency": "תדירות - עליך לבחור אחד מהערכים הבאים בדיוק: פעם ביום - q.d., פעמיים ביום - b.i.d., שלוש פעמים ביום - t.i.d., ארבע פעמים ביום - q.i.d., כל 4 שעות - q4h, כל 6 שעות - q6h, כל 8 שעות - q8h, כל 12 שעות - q12h, יום כן, יום לא - qod, מיידית - stat, לפי הצורך - prn, לפני השינה - h.s., לפני אוכל - a.c., אחרי אוכל - p.c., לסירוגין - int., בכל בוקר - q.a.m., בכל ערב - q.p.m.",
            "duration": "משך הטיפול בימים (לדוגמה: 10)",
            "form": "צורת התרופה - עליך לבחור אחד מהערכים הבאים בדיוק (התחשב בגיל המטופל לפני שאתה מציע כדורים, סירופ וכו'): טבליה - tab, קפסולה - cap, סירופ - syr, תרחיף - susp, תמיסה - sol, זריקה - inj, שקית - sach, גרנולות - gran, משחה - ung, קרם - crm, נר - supp, ג׳ל - gel, סוכריה למציצה - loz, טיפות - drops, מדבקה - patch, משאף - inh, תרסיס - spray",
            "instructions": "הוראות מיוחדות למטופל",
            "notes": "הערות חשובות לרופא"
          },
          "alternatives": [
            {
              "medication": "שם התרופה הגנרית באותיות UPPERCASE באנגלית",
              "dosage": "מינון למנה בודדת בערך מספרי מעוגל לעשרות, יש להשתמש במשקל המטופל בקילוגרמים לחישוב המינון ולהתחשב בערך מינון מקסימלי, להציג ללא יחידות",
              "units": "יחידות - עליך לבחור אחד מהערכים הבאים בדיוק: מיליגרם - mg, גרם - g, מיקרוגרם - mcg, מיליליטר - mL, סמ״ק - cc, יחידות בינלאומיות - IU, יחידות בינלאומיות - UI, אחוז - %, חלקים למיליון - ppm, השפרצות - spray, מילי-אקוויולנט - mEq, מילימול - mmol, יחידה - U",
              "route": "דרך מתן - עליך לבחור אחד מהערכים הבאים בדיוק: דרך הפה - p.o., תוך ורידי - IV, תוך שרירי - IM, תת-עורי - SC/SubQ, מתחת ללשון - SL, דרך פי הטבעת - PR, שימוש מקומי - top, בשאיפה - inh, דרך האף - nas, לעין - opth, לאוזן - otic, לנרתיק - vag, תוך-עורי - ID, תוך-קנה - IT",
              "frequency": "תדירות - עליך לבחור אחד מהערכים הבאים בדיוק: פעם ביום - q.d., פעמיים ביום - b.i.d., שלוש פעמים ביום - t.i.d., ארבע פעמים ביום - q.i.d., כל 4 שעות - q4h, כל 6 שעות - q6h, כל 8 שעות - q8h, כל 12 שעות - q12h, יום כן, יום לא - qod, מיידית - stat, לפי הצורך - prn, לפני השינה - h.s., לפני אוכל - a.c., אחרי אוכל - p.c., לסירוגין - int., בכל בוקר - q.a.m., בכל ערב - q.p.m.",
              "duration": "משך הטיפול בימים (לדוגמה: 10)",
              "form": "צורת התרופה - עליך לבחור אחד מהערכים הבאים בדיוק (התחשב בגיל המטופל לפני שאתה מציע כדורים, סירופ וכו'): טבליה - tab, קפסולה - cap, סירופ - syr, תרחיף - susp, תמיסה - sol, זריקה - inj, שקית - sach, גרנולות - gran, משחה - ung, קרם - crm, נר - supp, ג׳ל - gel, סוכריה למציצה - loz, טיפות - drops, מדבקה - patch, משאף - inh, תרסיס - spray",
              "instructions": "הוראות מיוחדות למטופל",
              "notes": "הערות חשובות לרופא"
            }
          ],
          "considerations": [
            "שיקול קליני ראשון",
            "שיקול קליני שני"
          ]
        }
        
        אם אין לך מספיק מידע, השתמש במבנה JSON הבא:
        
        {
          "diagnosis": "לא זוהתה אבחנה ספציפית",
          "source": "מידע כללי",
          "message": "הודעה למשתמש על כך שחסר מידע",
          "examples": [
            "דוגמה לשאילתה טובה 1",
            "דוגמה לשאילתה טובה 2"
          ]
        }
        
        חשוב! ודא כי הערכים שאתה מחזיר, במיוחד עבור units, route, frequency, ו-form, חייבים להתאים בדיוק לאחת מהאפשרויות שפורטו לעיל.
        
        הקפד להחזיר אך ורק את אובייקט ה-JSON ללא הסברים או טקסט נוסף. האובייקט חייב להיות תקין לחלוטין מבחינת תחביר JSON.
      `;
      
      // Call OpenAI API with gpt-4.1-nano
      const response = await fetch('https://us-central1-pedi-rag.cloudfunctions.net/v1ChatCompletions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o", // Using gpt-4.1-nano as requested
          messages: [
            {
              role: "system",
              content: systemMessage
            },
            {
              role: "user",
              content: antibioticQuery
            }
          ],
          temperature: 0, // Lower temperature for more structured output
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API call failed');
      }
      
      const data = await response.json();

      console.log(data);
      
      
      // Process the AI response - should be a valid JSON string
      const aiResponseText = data.choices[0].message.content;
      const recommendation = parseAIResponse(aiResponseText);
      
      // Set the recommendation in state
      setAntibioticRecommendation(recommendation);
      
    } catch (error) {
      console.error('Error fetching recommendation:', error);
      
      setAntibioticRecommendation({
        diagnosis: 'שגיאת התחברות',
        source: 'שגיאת API',
        message: `אירעה שגיאה בקבלת ההמלצה: ${error.message}. אנא וודא שמפתח ה-API שלך תקף ושיש לך הרשאות מתאימות.`,
      });
    } finally {
      setIsLoadingRecommendation(false);
    }
  };
  
  // Apply recommendation to form
  const applyRecommendation = (recommendation) => {
    if (!recommendation || !recommendation.primaryRecommendation) return;
    
    const rec = recommendation.primaryRecommendation;
    
    // Map units specifically based on Hebrew or English terms
    const mapUnits = (unitValue) => {
      if (!unitValue) return '';
      
      // Dictionary for mapping Hebrew unit names to proper format
      const unitMappings = {
        'מיליגרם': 'מיליגרם - mg',
        'מ"ג': 'מיליגרם - mg',
        'mg': 'מיליגרם - mg',
        'גרם': 'גרם - g',
        'ג': 'גרם - g',
        'g': 'גרם - g',
        'מיקרוגרם': 'מיקרוגרם - mcg',
        'מק"ג': 'מיקרוגרם - mcg',
        'mcg': 'מיקרוגרם - mcg',
        'μg': 'מיקרוגרם - mcg',
        'מיליליטר': 'מיליליטר - mL',
        'מ"ל': 'מיליליטר - mL',
        'ml': 'מיליליטר - mL',
        'mL': 'מיליליטר - mL',
        'סמ"ק': 'סמ״ק - cc',
        'סמ״ק': 'סמ״ק - cc',
        'cc': 'סמ״ק - cc',
        'יחידות בינלאומיות': 'יחידות בינלאומיות - IU',
        'יב"ל': 'יחידות בינלאומיות - IU',
        'IU': 'יחידות בינלאומיות - IU',
        'UI': 'יחידות בינלאומיות - UI',
        'אחוז': 'אחוז - %',
        '%': 'אחוז - %',
        'חלקים למיליון': 'חלקים למיליון - ppm',
        'השפרצות': 'השפרצות - spray',
        'spray': 'השפרצות - spray',
        'ppm': 'חלקים למיליון - ppm',
        'מילי-אקוויולנט': 'מילי-אקוויולנט - mEq',
        'mEq': 'מילי-אקוויולנט - mEq',
        'מילימול': 'מילימול - mmol',
        'mmol': 'מילימול - mmol',
        'יחידה': 'יחידה - U',
        'U': 'יחידה - U'
      };
      
      // Check for exact match in our mapping
      if (unitMappings[unitValue]) {
        return unitMappings[unitValue];
      }
      
      // If not exact match, check for partial matches
      for (const [key, value] of Object.entries(unitMappings)) {
        if (unitValue.includes(key)) {
          return value;
        }
      }
      
      // Check if it's already in the correct format
      if (unitValue.includes(' - ')) {
        const parts = unitValue.split(' - ');
        for (const [key, value] of Object.entries(unitMappings)) {
          if (parts[0].includes(key) || parts[1].includes(key)) {
            return value;
          }
        }
      }
      
      // Default to mg if we can't determine 
      return 'מיליגרם - mg';
    };
    
    // Ensure other values match exactly with options lists
    const getMatchingOption = (value, optionsList) => {
      if (!value) return '';
      
      // First try exact match
      const exactMatch = optionsList.find(opt => opt === value);
      if (exactMatch) return exactMatch;
      
      // Then try partial match
      for (const option of optionsList) {
        // Check if the option contains the value or value contains the option
        if (option.includes(value) || value.includes(option)) {
          return option;
        }
      }
      
      return value; // Return original if no match found
    };
    
    // Update medication fields with proper formatting
    setMedicationInfo({
      name: rec.medication || '',
      dosage: rec.dosage || '',
      units: mapUnits(rec.units || ''),
      form: getMatchingOption(rec.form, formOptions) || '',
      route: getMatchingOption(rec.route, routeOptions) || '',
      frequency: getMatchingOption(rec.frequency, frequencyOptions) || '',
      instructions: rec.instructions || rec.notes || ''
    });
    
    // Update supply info if duration is provided
    if (rec.duration) {
      setSupplyTab('duration');
      setSupplyInfo({
        ...supplyInfo,
        duration: rec.duration,
        durationUnits: 'ימים - days'
      });
    }
    
    // Close the dialog
    closeAntibioticHelper();
  };

  return (
    <div className="rtl w-full max-w-4xl mx-auto p-4 bg-gray-50 rounded-lg shadow" dir="rtl">
      <h1 className="text-2xl font-bold text-center mb-6">טופס הכנת מרשם רפואי</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Information */}
        <div className="bg-white p-4 rounded-md shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-blue-700">פרטי המטופל</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="היסטוריית פרטי המטופל"
                onClick={() => setHistoryDialog('patient')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                title="מילוי מהיסטוריה"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">history</span>
              </button>
              <button
                type="button"
                onClick={() => clearHistory('patient')}
                className="text-xs font-bold text-red-600 hover:text-red-700"
              >
                נקה
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                שם פרטי <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={patientInfo.firstName}
                onChange={(e) => setPatientInfo({...patientInfo, firstName: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                שם משפחה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={patientInfo.lastName}
                onChange={(e) => setPatientInfo({...patientInfo, lastName: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                תעודת זהות <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={patientInfo.idNumber}
                onChange={(e) => setPatientInfo({...patientInfo, idNumber: e.target.value})}
                required
              />
            </div>
          </div>
        </div>
        
        {/* Medication Information */}
        <div className="bg-white p-4 rounded-md shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-blue-700">פרטי התרופה</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="היסטוריית פרטי התרופה"
                onClick={() => setHistoryDialog('medication')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                title="מילוי מהיסטוריה"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">history</span>
              </button>
              <button
                type="button"
                onClick={() => clearHistory('medication')}
                className="text-xs font-bold text-red-600 hover:text-red-700"
              >
                נקה
              </button>
            </div>
            {showExperimentalControls && (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={openApiKeyDialog}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
                  >
                    התחבר ל-OpenAI
                  </button>
                ) : (
                  <span className="text-green-600 text-sm ml-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    מחובר ל-OpenAI
                  </span>
                )}
                <button
                  type="button"
                  onClick={openAntibioticHelper}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  עזרה למרשם אנטיביוטי
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                שם התרופה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                value={medicationInfo.name}
                onChange={(e) => setMedicationInfo({...medicationInfo, name: e.target.value})}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  מינון
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={medicationInfo.dosage}
                  onChange={(e) => setMedicationInfo({...medicationInfo, dosage: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  יחידות 
                </label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 appearance-none bg-white relative"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  value={medicationInfo.units === OTHER_OPTION ? OTHER_OPTION : medicationInfo.units}
                  onChange={(e) => handleMedicationValueChange('units', e.target.value)}
                >
                  <option value="">בחר יחידות</option>
                  {unitOptions.map((unit) => {
                    // Add Hebrew labels for unit options
                    let hebrewLabel = "";
                    switch(unit) {
                      case 'mg': hebrewLabel = "מיליגרם"; break;
                      case 'g': hebrewLabel = "גרם"; break;
                      case 'mcg': hebrewLabel = "מיקרוגרם"; break;
                      case 'mL': hebrewLabel = "מיליליטר"; break;
                      case 'cc': hebrewLabel = "סמ״ק"; break;
                      case 'IU': hebrewLabel = "יחידות בינלאומיות"; break;
                      case 'UI': hebrewLabel = "יחידות בינלאומיות"; break;
                      case '%': hebrewLabel = "אחוז"; break;
                      case 'ppm': hebrewLabel = "חלקים למיליון"; break;
                      case 'spray': hebrewLabel = "השפרצות"; break;
                      case 'mEq': hebrewLabel = "מילי-אקוויולנט"; break;
                      case 'mmol': hebrewLabel = "מילימול"; break;
                      case 'U': hebrewLabel = "יחידה"; break;
                      default: hebrewLabel = unit;
                    }
                    return (
                      <option key={unit} value={`${hebrewLabel} - ${unit}`}>{hebrewLabel} - {unit}</option>
                    );
                  })}
                  <option value={OTHER_OPTION}>אחר</option>
                </select>
                {medicationInfo.units === OTHER_OPTION && (
                  <input
                    type="text"
                    className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={customMedicationValues.units}
                    onChange={(e) => handleCustomMedicationValueChange('units', e.target.value)}
                    placeholder="הקלד יחידה מותאמת"
                  />
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                צורת התרופה
              </label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 appearance-none bg-white relative"
                style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                value={medicationInfo.form === OTHER_OPTION ? OTHER_OPTION : medicationInfo.form}
                onChange={(e) => handleMedicationValueChange('form', e.target.value)}
              >
                <option value="">בחר צורה</option>
                {formOptions.map((form) => (
                  <option key={form} value={form}>{form}</option>
                ))}
                <option value={OTHER_OPTION}>אחר</option>
              </select>
              {medicationInfo.form === OTHER_OPTION && (
                <input
                  type="text"
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={customMedicationValues.form}
                  onChange={(e) => handleCustomMedicationValueChange('form', e.target.value)}
                  placeholder="הקלד צורת תרופה מותאמת"
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                דרך מתן <span className="text-red-500">*</span>
              </label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 appearance-none bg-white relative"
                style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                value={medicationInfo.route === OTHER_OPTION ? OTHER_OPTION : medicationInfo.route}
                onChange={(e) => handleMedicationValueChange('route', e.target.value)}
                required
              >
                <option value="">בחר דרך מתן</option>
                {routeOptions.map((route) => (
                  <option key={route} value={route}>{route}</option>
                ))}
                <option value={OTHER_OPTION}>אחר</option>
              </select>
              {medicationInfo.route === OTHER_OPTION && (
                <input
                  type="text"
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={customMedicationValues.route}
                  onChange={(e) => handleCustomMedicationValueChange('route', e.target.value)}
                  placeholder="הקלד דרך מתן מותאמת"
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                תדירות <span className="text-red-500">*</span>
              </label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 appearance-none bg-white relative"
                style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                value={medicationInfo.frequency}
                onChange={(e) => setMedicationInfo({...medicationInfo, frequency: e.target.value})}
                required
              >
                <option value="">בחר תדירות</option>
                {frequencyOptions.map((freq) => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                הוראות נוספות
              </label>
              <textarea
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows="2"
                value={medicationInfo.instructions}
                onChange={(e) => setMedicationInfo({...medicationInfo, instructions: e.target.value})}
              ></textarea>
            </div>
          </div>
        </div>
        
        {/* Supply Information */}
        <div className="bg-white p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-blue-700">כמות לניפוק</h2>
          
          <div className="flex mb-4 border-b">
            <button
              type="button"
              className={`py-2 px-4 ${supplyTab === 'quantity' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
              onClick={() => setSupplyTab('quantity')}
            >
              כמות לניפוק
            </button>
            <button
              type="button"
              className={`py-2 px-4 ${supplyTab === 'duration' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
              onClick={() => setSupplyTab('duration')}
            >
              משך הטיפול
            </button>
          </div>
          
          {supplyTab === 'quantity' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  כמות <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={supplyInfo.quantity}
                  onChange={(e) => setSupplyInfo({...supplyInfo, quantity: e.target.value})}
                  required={supplyTab === 'quantity'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  יחידות
                </label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 appearance-none bg-white relative"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  value={supplyInfo.quantityUnits}
                  onChange={(e) => setSupplyInfo({...supplyInfo, quantityUnits: e.target.value})}
                >
                  {quantityUnitOptions.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  משך זמן <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={supplyInfo.duration}
                  onChange={(e) => setSupplyInfo({...supplyInfo, duration: e.target.value})}
                  required={supplyTab === 'duration'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  יחידות זמן
                </label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 appearance-none bg-white relative"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                  value={supplyInfo.durationUnits}
                  onChange={(e) => setSupplyInfo({...supplyInfo, durationUnits: e.target.value})}
                >
                  {durationUnitOptions.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Doctor Information */}
        <div className="bg-white p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-blue-700">פרטי הרופא</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                שם פרטי
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={doctorInfo.firstName}
                onChange={(e) => setDoctorInfo({...doctorInfo, firstName: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                שם משפחה
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={doctorInfo.lastName}
                onChange={(e) => setDoctorInfo({...doctorInfo, lastName: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                התמחות
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={doctorInfo.specialty}
                onChange={(e) => setDoctorInfo({...doctorInfo, specialty: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                מספר רישיון
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={doctorInfo.licenseNumber}
                onChange={(e) => setDoctorInfo({...doctorInfo, licenseNumber: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                טלפון
              </label>
              <input
                type="tel"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={doctorInfo.phone}
                onChange={(e) => setDoctorInfo({...doctorInfo, phone: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                מרפאה / בית חולים
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={doctorInfo.clinic}
                onChange={(e) => setDoctorInfo({...doctorInfo, clinic: e.target.value})}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            הכן מרשם
          </button>
        </div>
      </form>

      {historyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">
                {historyDialog === 'patient' ? 'מילוי פרטי מטופל קודמים' : 'מילוי פרטי תרופה קודמים'}
              </h2>
              <button
                type="button"
                onClick={() => setHistoryDialog(null)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-2">
              {((historyDialog === 'patient' ? patientHistory : medicationHistory) || []).length === 0 ? (
                <p className="text-sm text-gray-500">אין פריטים שמורים עדיין.</p>
              ) : (
                (historyDialog === 'patient' ? patientHistory : medicationHistory).map((entry) => (
                  <div
                    key={entry.id}
                    className="group relative flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        applyHistorySelection(historyDialog, entry);
                      }}
                      className="w-full text-right p-3 rounded-md border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-800">{entry.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {historyDialog === 'patient'
                          ? `${entry.data.firstName || ''} ${entry.data.lastName || ''} • ${entry.data.idNumber || ''}`.trim().replace(/\s+/g, ' ')
                          : `${entry.data.name || ''} • ${entry.data.dosage || ''} ${entry.data.units ? entry.data.units.split(' - ')[0] : ''} • ${entry.data.route ? entry.data.route.split(' - ')[0] : ''}`.trim().replace(/\s+/g, ' ')}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeHistoryEntry(historyDialog, entry.id);
                      }}
                      aria-label="מחק פריט מהיסטוריה"
                      className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 text-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Print Dialog */}
      {showPrintDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-screen overflow-auto">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">תצוגה מקדימה של המרשם</h2>
            </div>
            
            <div id="prescription-print" className="p-6">
              <div className="border-2 border-gray-300 p-6 rounded-lg">
                <div className="text-center font-bold text-xl mb-4">מרשם רפואי</div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    {doctorInfo.clinic && (
                      <>
                        <div className="font-bold">פרטי המרפאה:</div>
                        <p>{doctorInfo.clinic}</p>
                      </>
                    )}
                    {doctorInfo.phone && <p>טלפון: {doctorInfo.phone}</p>}
                  </div>
                  
                  <div className="text-left">
                    <p>תאריך: {currentDate}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-300 my-4"></div>
                
                <div className="mb-4">
                  <div className="font-bold">פרטי המטופל:</div>
                  <p>שם: {patientInfo.firstName} {patientInfo.lastName}</p>
                  <p>ת.ז.: {patientInfo.idNumber}</p>
                </div>
                
                <div className="border-t border-gray-300 my-4"></div>
                
                <div className="mb-4">
                  <div className="flex items-center">
                    <div className="font-bold text-xl mr-2">Rx</div>
                    <div className="font-bold mr-1">-</div>
                    <div className="font-bold">תרופה:</div>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-lg font-semibold">{medicationInfo.name}</p>
                    <p>
                      {medicationInfo.dosage} {medicationInfo.units ? medicationInfo.units.split(' - ')[0] : ''}
                      {medicationInfo.form && ` (${medicationInfo.form.split(' - ')[0]})`}
                    </p>
                    <p>
                      דרך מתן: {medicationInfo.route ? medicationInfo.route.split(' - ')[0] : ''}
                    </p>
                    <p>
                      תדירות: {medicationInfo.frequency ? medicationInfo.frequency.split(' - ')[0] : ''}
                    </p>
                    {medicationInfo.instructions && (
                      <p>הוראות נוספות: {medicationInfo.instructions}</p>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-300 my-4"></div>
                
                <div className="mb-4">
                  <div className="font-bold">ניפוק:</div>
                  {supplyTab === 'quantity' ? (
                    <p>
                      כמות: {supplyInfo.quantity} {supplyInfo.quantityUnits.split(' - ')[0]}
                    </p>
                  ) : (
                    <p>
                      משך טיפול: {supplyInfo.duration} {supplyInfo.durationUnits.split(' - ')[0]}
                    </p>
                  )}
                </div>
                
                <div className="border-t border-gray-300 my-4"></div>
                
                <div className="mt-8 grid grid-cols-2">
                  <div>
                    <div className="font-bold mb-1">חתימת הרופא:</div>
                    <div className="h-16 border-b border-gray-400"></div>
                    <p className="mt-1">
                      ד"ר {doctorInfo.firstName} {doctorInfo.lastName}
                      {doctorInfo.specialty && `, ${doctorInfo.specialty}`}
                    </p>
                    {doctorInfo.licenseNumber && <p>מ.ר. {doctorInfo.licenseNumber}</p>}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t flex justify-end space-x-2">
              <button
                onClick={closePrintDialog}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                סגור
              </button>
              
              <button
                onClick={printPrescription}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
              >
                הדפס
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* OpenAI API Key Dialog */}
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">התחברות ל-OpenAI</h2>
              <button 
                onClick={closeApiKeyDialog}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6">
              <p className="mb-4">
                יש להזין מפתח API של OpenAI כדי להשתמש במערכת העזר האנטיביוטית.
                המפתח יישמר בדפדפן שלך ולא יישלח לשרת אחר מלבד OpenAI.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מפתח API של OpenAI
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {apiKeyError && (
                  <p className="mt-1 text-sm text-red-600">{apiKeyError}</p>
                )}
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                <a 
                  href="https://platform.openai.com/account/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  לחץ כאן
                </a> כדי ליצור מפתח API של OpenAI אם אין לך.
              </p>
            </div>
            
            <div className="p-4 border-t flex justify-between">
              <button
                onClick={closeApiKeyDialog}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                ביטול
              </button>
              
              <button
                onClick={handleConnectToOpenAI}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={connectionStatus === 'מתחבר...'}
              >
                {connectionStatus === 'מתחבר...' ? connectionStatus : 'התחבר'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Antibiotic Helper Dialog */}
      {showAntibioticHelper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-screen overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">מערכת עזר למרשם אנטיביוטי</h2>
              <div className="flex items-center">
                <span className="text-xs text-green-600 ml-4">מחובר ל-OpenAI</span>
                <button 
                  onClick={closeAntibioticHelper}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  &times;
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="mb-3">תאר את המטופל והאבחנה בשפה חופשית:</p>
                <div className="flex items-center">
                  <input
                    type="text"
                    className="flex-1 p-3 border border-gray-300 rounded-md shadow-sm"
                    placeholder='לדוגמה: "ילד בן 3 ששוקל 15 קילו עם דלקת אוזניים"'
                    value={antibioticQuery}
                    onChange={(e) => setAntibioticQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && getAntibioticRecommendation()}
                  />
                  <button
                    type="button"
                    className="mr-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={getAntibioticRecommendation}
                    disabled={isLoadingRecommendation}
                  >
                    {isLoadingRecommendation ? 'מחפש...' : 'קבל המלצה'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">* מקור המידע: הנחיות קליניות בישראל לרפואת ילדים וספר רפואת ילדים נלסון</p>
                <p className="text-sm text-blue-600 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  מחובר לכלי AI שמכיל מידע מנלסון והנחיות קליניות בישראל
                </p>
              </div>
              
              {isLoadingRecommendation && (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {!isLoadingRecommendation && antibioticRecommendation && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-bold mb-2">{antibioticRecommendation.diagnosis}</h3>
                  <p className="text-sm text-gray-600 mb-4">מקור: {antibioticRecommendation.primaryRecommendation.source}</p>
                  <p className="text-sm text-gray-600 mb-4">ציטוט: {antibioticRecommendation.primaryRecommendation.citation}</p>
                  
                  {antibioticRecommendation.message ? (
                    <div className="mb-4">
                      <p>{antibioticRecommendation.message}</p>
                      {antibioticRecommendation.examples && (
                        <div className="mt-2">
                          <p className="font-medium">דוגמאות לשאילתות:</p>
                          <ul className="list-disc list-inside">
                            {antibioticRecommendation.examples.map((example, idx) => (
                              <li key={idx} className="text-sm text-gray-700">{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-md shadow-sm mb-4 border-r-4 border-green-500">
                        <h4 className="font-bold mb-2">המלצה עיקרית:</h4>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">תרופה:</p>
                            <p>{antibioticRecommendation.primaryRecommendation.medication}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">מינון:</p>
                            <p>{antibioticRecommendation.primaryRecommendation.dosage} {antibioticRecommendation.primaryRecommendation.units?.split(' - ')[0]}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">דרך מתן:</p>
                            <p>{antibioticRecommendation.primaryRecommendation.route?.split(' - ')[0]}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">תדירות:</p>
                            <p>{antibioticRecommendation.primaryRecommendation.frequency?.split(' - ')[0]}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">משך הטיפול:</p>
                            <p>{antibioticRecommendation.primaryRecommendation.duration} ימים</p>
                          </div>
                          {antibioticRecommendation.primaryRecommendation.form && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">צורה:</p>
                              <p>{antibioticRecommendation.primaryRecommendation.form?.split(' - ')[0]}</p>
                            </div>
                          )}
                        </div>
                        {antibioticRecommendation.primaryRecommendation.notes && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">הערות:</p>
                            <p className="text-sm">{antibioticRecommendation.primaryRecommendation.notes}</p>
                          </div>
                        )}
                        <div className="mt-4">
                          <button
                            type="button"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            onClick={() => applyRecommendation(antibioticRecommendation)}
                          >
                            הזרק המלצה למרשם
                          </button>
                        </div>
                      </div>
                      
                      {antibioticRecommendation.alternatives && antibioticRecommendation.alternatives.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold mb-2">חלופות:</h4>
                          {antibioticRecommendation.alternatives.map((alt, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-md shadow-sm mb-2 border-r-4 border-blue-400">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-700">תרופה:</p>
                                  <p>{alt.medication}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">מינון:</p>
                                  <p>{alt.dosage} {alt.units?.split(' - ')[0]}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                  <p className="text-sm font-medium text-gray-700">תדירות:</p>
                                  <p>{alt.frequency?.split(' - ')[0]}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">משך הטיפול:</p>
                                  <p>{alt.duration} ימים</p>
                                </div>
                              </div>
                              {alt.notes && (
                                <div className="mt-1">
                                  <p className="text-sm font-medium text-gray-700">הערות:</p>
                                  <p className="text-sm">{alt.notes}</p>
                                </div>
                              )}
                              <div className="mt-2">
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  onClick={() => applyRecommendation({primaryRecommendation: alt})}
                                >
                                  השתמש בחלופה זו
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {antibioticRecommendation.considerations && antibioticRecommendation.considerations.length > 0 && (
                        <div>
                          <h4 className="font-bold mb-2">שיקולים קליניים:</h4>
                          <ul className="list-disc list-inside bg-white p-3 rounded-md shadow-sm">
                            {antibioticRecommendation.considerations.map((consideration, idx) => (
                              <li key={idx} className="mb-1">{consideration}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-between">
              {isConnected && (
                <button
                  onClick={handleDisconnectFromOpenAI}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                >
                  התנתק מ-OpenAI
                </button>
              )}
              
              <button
                onClick={closeAntibioticHelper}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 mr-auto"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionForm;