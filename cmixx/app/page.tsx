'use client';

import { XXNetwork, XXDirectMessages, useSDKStatus, useCredentialsStatus, XXDMSend, useDMClient } from "./xxdk";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { useState, ChangeEvent, useContext } from "react";

function StatusButton({ status, label }: { status: 'initializing' | 'ready' | 'error', label: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'ready':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'initializing':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'error':
        return 'Error';
      case 'initializing':
        return 'Initializing...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      <span className="text-sm font-medium">{label}: {getStatusText()}</span>
    </div>
  );
}

function WhistleblowerForm() {
  const dm = useDMClient();
  
  // Client 2 (Resolver) hardcoded credentials
  const CLIENT2_TOKEN = '2537252129';
  const CLIENT2_PUBLIC_KEY = 'C0nFOJ9kcaSz6cN5/aDqiAnzOVXfC9ogg7JRvzrZ76E=';

  const [formData, setFormData] = useState({
    issueType: '',
    category: '',
    severity: '',
    location: '',
    description: '',
    evidence: '',
    evmAddress: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    // Check if DM client is ready
    if (dm === null) {
      setErrorMessage('DM Client not ready yet. Please wait for credentials to initialize.');
      setIsSubmitting(false);
      setSubmitStatus('error');
      return;
    }

    // Format form data as JSON
    const reportData = {
      type: 'whistleblower_report',
      timestamp: new Date().toISOString(),
      issueType: formData.issueType,
      category: formData.category,
      severity: formData.severity,
      location: formData.location,
      description: formData.description,
      evidence: formData.evidence,
      evmAddress: formData.evmAddress,
    };

    const messageText = JSON.stringify(reportData, null, 2);

    try {
      // Send message through xxdk to Client 2
      const success = await XXDMSend(dm, messageText, CLIENT2_PUBLIC_KEY, CLIENT2_TOKEN);
      
      if (success) {
        console.log('Whistleblower Report Submitted via xxdk:', reportData);
        setSubmitStatus('success');
        // Reset form after 2 seconds
        setTimeout(() => {
          setFormData({
            issueType: '',
            category: '',
            severity: '',
            location: '',
            description: '',
            evidence: '',
            evmAddress: '',
          });
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setErrorMessage('Failed to send report. Please check console for details and try again.');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setErrorMessage('An error occurred while sending the report. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto relative">
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 relative overflow-visible">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            🌱 Sustainability Whistleblower Portal
          </h2>
          <p className="text-gray-600 text-base">
            Report environmental violations, sustainability issues, or unethical practices anonymously and securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="flex flex-col relative z-10">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="Select the type of issue"
              selectedKeys={formData.issueType ? [formData.issueType] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                handleChange('issueType', value);
              }}
              isRequired
              popoverProps={{
                placement: "bottom-start",
                classNames: {
                  content: "z-[9999] p-2 bg-white border border-gray-200 rounded-lg shadow-xl",
                },
              }}
              classNames={{
                trigger: "min-h-12 bg-white border-2 border-gray-300 rounded-lg hover:border-green-400 focus:border-green-500 transition-colors shadow-sm",
                value: "text-gray-900 font-medium",
                popoverContent: "z-[9999]",
                listbox: "p-2 gap-1",
                listboxWrapper: "max-h-[300px] overflow-y-auto",
              }}
            >
              <SelectItem key="pollution" value="pollution" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Environmental Pollution
              </SelectItem>
              <SelectItem key="waste" value="waste" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Waste Management Violations
              </SelectItem>
              <SelectItem key="emissions" value="emissions" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Carbon Emissions Violations
              </SelectItem>
              <SelectItem key="deforestation" value="deforestation" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Deforestation/Illegal Logging
              </SelectItem>
              <SelectItem key="water" value="water" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Water Contamination
              </SelectItem>
              <SelectItem key="wildlife" value="wildlife" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Wildlife Protection Violations
              </SelectItem>
              <SelectItem key="greenwashing" value="greenwashing" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Greenwashing/Fraud
              </SelectItem>
              <SelectItem key="other" value="other" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Other Sustainability Issue
              </SelectItem>
            </Select>
          </div>

          <div className="flex flex-col relative z-10">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="Select category"
              selectedKeys={formData.category ? [formData.category] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                handleChange('category', value);
              }}
              isRequired
              popoverProps={{
                placement: "bottom-start",
                classNames: {
                  content: "z-[9999] p-2 bg-white border border-gray-200 rounded-lg shadow-xl",
                },
              }}
              classNames={{
                trigger: "min-h-12 bg-white border-2 border-gray-300 rounded-lg hover:border-green-400 focus:border-green-500 transition-colors shadow-sm",
                value: "text-gray-900 font-medium",
                popoverContent: "z-[9999]",
                listbox: "p-2 gap-1",
                listboxWrapper: "max-h-[300px] overflow-y-auto",
              }}
            >
              <SelectItem key="corporate" value="corporate" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Corporate
              </SelectItem>
              <SelectItem key="government" value="government" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Government
              </SelectItem>
              <SelectItem key="ngo" value="ngo" className="rounded-lg py-2 px-3 hover:bg-green-50">
                NGO/Non-Profit
              </SelectItem>
              <SelectItem key="individual" value="individual" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Individual
              </SelectItem>
              <SelectItem key="international" value="international" className="rounded-lg py-2 px-3 hover:bg-green-50">
                International Organization
              </SelectItem>
            </Select>
          </div>

          <div className="flex flex-col relative z-10">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Severity Level <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="How severe is this issue?"
              selectedKeys={formData.severity ? [formData.severity] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                handleChange('severity', value);
              }}
              isRequired
              popoverProps={{
                placement: "bottom-start",
                classNames: {
                  content: "z-[9999] p-2 bg-white border border-gray-200 rounded-lg shadow-xl",
                },
              }}
              classNames={{
                trigger: "min-h-12 bg-white border-2 border-gray-300 rounded-lg hover:border-green-400 focus:border-green-500 transition-colors shadow-sm",
                value: "text-gray-900 font-medium",
                popoverContent: "z-[9999]",
                listbox: "p-2 gap-1",
                listboxWrapper: "max-h-[300px] overflow-y-auto",
              }}
            >
              <SelectItem key="low" value="low" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Low - Minor violation
              </SelectItem>
              <SelectItem key="medium" value="medium" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Medium - Moderate concern
              </SelectItem>
              <SelectItem key="high" value="high" className="rounded-lg py-2 px-3 hover:bg-green-50">
                High - Serious violation
              </SelectItem>
              <SelectItem key="critical" value="critical" className="rounded-lg py-2 px-3 hover:bg-green-50">
                Critical - Immediate threat
              </SelectItem>
            </Select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Location of Happening <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="City, Country or Region"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              isRequired
              classNames={{
                input: "min-h-12 text-gray-900 font-medium",
                inputWrapper: "bg-white border-2 border-gray-300 hover:border-green-400 focus-within:border-green-500 transition-colors shadow-sm rounded-lg",
              }}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full min-h-[140px] p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-400 transition-colors resize-y text-sm shadow-sm font-medium"
            placeholder="Provide a detailed description of the issue, including dates, times, and any relevant context..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Evidence/Supporting Information
          </label>
          <textarea
            className="w-full min-h-[120px] p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-400 transition-colors resize-y text-sm shadow-sm font-medium"
            placeholder="Links to Evidence"
            value={formData.evidence}
            onChange={(e) => handleChange('evidence', e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            EVM Address
          </label>
          <Input
            placeholder="0x..."
            value={formData.evmAddress}
            onChange={(e) => handleChange('evmAddress', e.target.value)}
            classNames={{
              input: "min-h-12 text-gray-900 font-medium font-mono",
              inputWrapper: "bg-white border-2 border-gray-300 hover:border-green-400 focus-within:border-green-500 transition-colors shadow-sm rounded-lg",
            }}
            description="Enter your Ethereum Virtual Machine (EVM) compatible address"
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="flat"
            onPress={() => {
              setFormData({
                issueType: '',
                category: '',
                severity: '',
                location: '',
                description: '',
                evidence: '',
                evmAddress: '',
              });
            }}
            className="min-w-[120px]"
          >
            Clear Form
          </Button>
          <Button
            type="submit"
            color="success"
            isLoading={isSubmitting}
            isDisabled={!dm || !formData.issueType || !formData.category || !formData.severity || !formData.location || !formData.description}
            className="min-w-[140px]"
          >
            {submitStatus === 'success' ? 'Submitted ✓' : 'Submit Report'}
          </Button>
        </div>

        {submitStatus === 'success' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium text-sm">
              ✓ Your report has been submitted securely via xx Network. Thank you for helping protect our planet!
            </p>
          </div>
        )}

        {submitStatus === 'error' && errorMessage && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium text-sm">
              ✗ {errorMessage}
            </p>
          </div>
        )}
      </div>
    </form>
  );
}

function HomeContent() {
  const sdkStatus = useSDKStatus();
  const credentialsStatus = useCredentialsStatus();

  return (
    <main className="min-h-screen w-full p-6 relative overflow-hidden">
      {/* Floating particles for animation */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-green-300 rounded-full opacity-40 floating-particle" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-3 h-3 bg-blue-300 rounded-full opacity-30 floating-particle" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-emerald-300 rounded-full opacity-40 floating-particle" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-teal-300 rounded-full opacity-30 floating-particle" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header with Status Buttons */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-3">
                🌍 Sustainability Whistleblower Platform
              </h1>
              <p className="text-gray-600 text-base">
                Secure, anonymous reporting for environmental protection
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-[200px]">
              <StatusButton status={sdkStatus} label="SDK Status" />
              <StatusButton status={credentialsStatus} label="Credentials Status" />
            </div>
          </div>
        </div>

        {/* Whistleblower Form */}
        <WhistleblowerForm />
      </div>
    </main>
  );
}

export default function Home() {
  return (
      <XXNetwork>
        <XXDirectMessages>
        <HomeContent />
        </XXDirectMessages>
      </XXNetwork>
  );
}
