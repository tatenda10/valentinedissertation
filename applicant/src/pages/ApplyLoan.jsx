import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import API_URL from '../utils/Api';
import ErrorModal from '../components/shared/ErrorModal';
import SuccessModal from '../components/shared/SuccessModal';

const ApplyLoan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // PDF upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirmUpload, setConfirmUpload] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Loan Details (Step 1)
    amount: '',
    purpose: '',
    duration: '',
    
    // Income & Employment (Step 2) - COMPLETE
    monthlyIncome: '',
    employmentStatus: '',
    businessIndustry: '',        // NEW - from documentation
    hasTin: '',                  // NEW - Tax compliance
    vatRegistered: '',           // NEW - Tax compliance
    
    // Housing & Assets (Step 4) - COMPLETE
    residentialArea: '',
    residentialAreaType: '',
    timeAtCurrentAddress: '',
    housingStatus: '',
    ownsVehicle: 'no',           // NEW - from documentation
    vehicleInsurance: ''         // NEW - from documentation
  });

  const inputClassName = 'mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#0f4d7a] focus:ring-2 focus:ring-[#0f4d7a]/20';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // PDF file handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Only PDF files are allowed');
        setSelectedFile(null);
      } else if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        setSelectedFile(null);
      } else {
        setUploadError('');
        setSelectedFile(file);
      }
    }
  };

  const validateForm = () => {
    const requiredFields = {
      // Step 1
      amount: 'Loan Amount',
      purpose: 'Loan Purpose',
      duration: 'Loan Duration',
      
      // Step 2
      monthlyIncome: 'Monthly Income',
      employmentStatus: 'Type of Work',
      
      // Step 4
      residentialArea: 'Area of Residence',
      residentialAreaType: 'Type of Area',
      timeAtCurrentAddress: 'Time at Current Address',
      housingStatus: 'Housing Status'
    };

    const emptyFields = [];

    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        emptyFields.push(label);
      }
    });

    // PDF validation
    if (!selectedFile) {
      emptyFields.push('EcoCash Statement PDF');
    }
    if (!confirmUpload) {
      emptyFields.push('Confirmation of authentic transaction history');
    }

    return emptyFields;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const emptyFields = validateForm();
    
    if (emptyFields.length > 0) {
      setError(`Please fill in the following required fields:\n${emptyFields.join('\n')}`);
      setShowErrorModal(true);
      return;
    }

    setIsLoading(true);
    setIsUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      const submitFormData = new FormData();
      submitFormData.append('statement', selectedFile);
      submitFormData.append('amount', formData.amount);
      submitFormData.append('purpose', formData.purpose);
      submitFormData.append('duration', formData.duration);
      submitFormData.append('monthlyIncome', formData.monthlyIncome);
      submitFormData.append('employmentStatus', formData.employmentStatus);
      submitFormData.append('existingLoans', '0');
      submitFormData.append('clientId', user.id);
      
      // Optional fields - stored for data collection
      submitFormData.append('businessIndustry', formData.businessIndustry);
      submitFormData.append('hasTin', formData.hasTin);
      submitFormData.append('vatRegistered', formData.vatRegistered);
      submitFormData.append('residentialArea', formData.residentialArea);
      submitFormData.append('residentialAreaType', formData.residentialAreaType);
      submitFormData.append('timeAtCurrentAddress', formData.timeAtCurrentAddress);
      submitFormData.append('housingStatus', formData.housingStatus);
      submitFormData.append('ownsVehicle', formData.ownsVehicle);
      submitFormData.append('vehicleInsurance', formData.vehicleInsurance);

      const response = await axios.post(`${API_URL}/loans/submit-with-pdf`, submitFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccessMessage(response.data.message || 'Loan application submitted successfully!');
      setShowSuccessModal(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit loan application';
      setError(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.amount || !formData.purpose || !formData.duration) {
        setError('Please fill in all required fields before proceeding');
        setShowErrorModal(true);
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.monthlyIncome || !formData.employmentStatus) {
        setError('Please fill in all required fields before proceeding');
        setShowErrorModal(true);
        return;
      }
    }
    if (currentStep === 3) {
      if (!selectedFile) {
        setError('Please upload your EcoCash statement PDF');
        setShowErrorModal(true);
        return;
      }
      if (!confirmUpload) {
        setError('Please confirm that this is your authentic transaction history');
        setShowErrorModal(true);
        return;
      }
    }
    setCurrentStep(step => step + 1);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Basic Loan Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Loan Amount ($)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className={inputClassName}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Duration (months)</label>
          <select
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className={inputClassName}
            required
          >
            <option value="">Select Duration</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Purpose of Loan</label>
          <textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            className={inputClassName}
            rows="3"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Income, Employment & Business</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Monthly Income ($)</label>
          <input
            type="number"
            name="monthlyIncome"
            value={formData.monthlyIncome}
            onChange={handleChange}
            className={inputClassName}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Type of Work</label>
          <select
            name="employmentStatus"
            value={formData.employmentStatus}
            onChange={handleChange}
            className={inputClassName}
            required
          >
            <option value="">Select Type</option>
            <option value="formal">Formal Employment</option>
            <option value="self_employed">Self-Employed</option>
            <option value="informal">Informal Trader</option>
            <option value="business">Small Business Owner</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        {/* NEW: Business Industry - from documentation */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Industry (if self-employed)</label>
          <select
            name="businessIndustry"
            value={formData.businessIndustry}
            onChange={handleChange}
            className={inputClassName}
          >
            <option value="">Select Industry</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="agriculture">Agriculture</option>
            <option value="transport">Transport</option>
            <option value="services">Services</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* NEW: Tax Compliance - from documentation */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Do you have a Tax Identification Number (TIN)?</label>
          <select
            name="hasTin"
            value={formData.hasTin}
            onChange={handleChange}
            className={inputClassName}
          >
            <option value="">Select</option>
            <option value="yes">Yes, I have a TIN</option>
            <option value="applied">I have applied</option>
            <option value="no">No, I do not have one</option>
          </select>
        </div>

        {/* NEW: VAT Registration - from documentation */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Are you VAT registered?</label>
          <select
            name="vatRegistered"
            value={formData.vatRegistered}
            onChange={handleChange}
            className={inputClassName}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="na">Not applicable</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Upload Transaction History</h3>
      <p className="text-slate-600">Upload your EcoCash statement to help us assess your creditworthiness.</p>
      
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
        <strong className="text-blue-800">📱 How to get your EcoCash statement:</strong>
        <ol className="mt-2 ml-4 text-sm text-blue-700 space-y-1">
          <li>1. Open your EcoCash app</li>
          <li>2. Go to History / Statements</li>
          <li>3. Select date range (minimum 3 months)</li>
          <li>4. Tap "Export" or "Download as PDF"</li>
          <li>5. Save the PDF file to your device</li>
        </ol>
      </div>
      
      <div className="text-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="pdfUpload"
        />
        <label
          htmlFor="pdfUpload"
          className="inline-block bg-[#0f4d7a] text-white px-6 py-2.5 rounded-xl cursor-pointer hover:bg-[#0b3e62] transition"
        >
          📄 Choose PDF File
        </label>
        {selectedFile && (
          <p className="mt-3 text-sm text-green-600">
            ✓ Selected: {selectedFile.name}
          </p>
        )}
      </div>
      
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <strong>Requirements:</strong>
        <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-1">
          <li>✅ PDF format only</li>
          <li>✅ Maximum file size: 10MB</li>
          <li>✅ At least 3 months of transaction history</li>
          <li>✅ At least 50 transactions</li>
        </ul>
      </div>
      
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="confirmUpload"
          checked={confirmUpload}
          onChange={(e) => setConfirmUpload(e.target.checked)}
          className="w-4 h-4 text-[#0f4d7a]"
        />
        <label htmlFor="confirmUpload" className="text-sm text-gray-700">
          I confirm that this is my authentic transaction history
        </label>
      </div>
      
      {uploadError && (
        <p className="text-red-500 text-sm">{uploadError}</p>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Housing & Assets</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Area of Residence</label>
          <input
            type="text"
            name="residentialArea"
            value={formData.residentialArea}
            onChange={handleChange}
            className={inputClassName}
            placeholder="e.g., Harare CBD"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type of Area</label>
          <select
            name="residentialAreaType"
            value={formData.residentialAreaType}
            onChange={handleChange}
            className={inputClassName}
            required
          >
            <option value="">Select Area Type</option>
            <option value="urban">Urban</option>
            <option value="suburban">Suburban</option>
            <option value="rural">Rural</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Time at Current Address</label>
          <input
            type="text"
            name="timeAtCurrentAddress"
            value={formData.timeAtCurrentAddress}
            onChange={handleChange}
            className={inputClassName}
            placeholder="e.g., 2 years"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Housing Status</label>
          <select
            name="housingStatus"
            value={formData.housingStatus}
            onChange={handleChange}
            className={inputClassName}
            required
          >
            <option value="">Select Housing Status</option>
            <option value="renting">Renting</option>
            <option value="own_mortgage">Own with mortgage</option>
            <option value="own_outright">Own outright</option>
            <option value="family">Living with family</option>
          </select>
        </div>

        {/* NEW: Vehicle Ownership - from documentation */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Do you own a vehicle?</label>
          <select
            name="ownsVehicle"
            value={formData.ownsVehicle}
            onChange={handleChange}
            className={inputClassName}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {/* NEW: Vehicle Insurance - from documentation (shown only if vehicle owned) */}
        {formData.ownsVehicle === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle Insurance Category</label>
            <select
              name="vehicleInsurance"
              value={formData.vehicleInsurance}
              onChange={handleChange}
              className={inputClassName}
            >
              <option value="">Select Insurance</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="third_party">Third Party Only</option>
              <option value="none">None</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Alternative Credit Assessment</h2>
          <p className="mt-2 text-slate-600">Help us understand your creditworthiness better</p>
          
          <div className="mt-4">
            <div className="flex justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-1/4 h-2 rounded-full mx-1 ${
                    currentStep >= step ? 'bg-[#0f4d7a]' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Step {currentStep} of 4
            </div>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <div className="flex justify-between pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(step => step - 1)}
                className="rounded-xl bg-slate-200 px-6 py-2.5 text-slate-700 transition hover:bg-slate-300"
              >
                Previous
              </button>
            )}
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="rounded-xl bg-[#0f4d7a] px-6 py-2.5 text-white transition hover:bg-[#0b3e62]"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || isUploading}
                className="rounded-xl bg-[#0f4d7a] px-6 py-2.5 text-white transition hover:bg-[#0b3e62] disabled:opacity-50"
              >
                {isUploading ? 'Uploading PDF...' : isLoading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>

      <ErrorModal
        isOpen={showErrorModal}
        message={error.split('\n').map((line, i) => (
          <div key={i} className="mb-2">
            {line}
          </div>
        ))}
        onClose={() => setShowErrorModal(false)}
      />
      
      <SuccessModal
        isOpen={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
};

export default ApplyLoan;