import express from 'express';
import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import fs from 'fs';

const app = express();
const PORT = 3001;

// Initialize printer (try-catch for missing package)
let printer;
try {
  const printerModule = await import('@thiagoelg/node-printer');
  printer = printerModule.default || printerModule;
  console.log('✅ Successfully loaded @thiagoelg/node-printer');
} catch (error) {
  console.warn('⚠️ Warning: @thiagoelg/node-printer not installed. Running in stub mode.');
  console.warn('Install with: npm install @thiagoelg/node-printer');
  printer = {
    getPrinters: () => {
      console.warn('Stub mode: getPrinters() called');
      return [];
    },
    printDirect: (options) => {
      console.warn('Stub mode: printDirect() called with options:', options);
      return {
        success: () => {
          console.log('⚠️ Stub mode: Pretending print succeeded');
        },
        error: () => {
          console.error('⚠️ Stub mode: Pretending print failed');
        }
      };
    }
  };
}

// Middleware to parse JSON bodies
app.use(express.json());

// Log available printers on startup
console.log('Available printers:', printer.getPrinters());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Print service is running' });
});

// Print endpoint
app.post('/print', async (req, res) => {
  console.log('\n=== POST /print received ===');
  
  try {
    const { klant, email, telefoon, klantnummer, merk, model, notities, datum, jobId } = req.body;
    
    console.log('📥 Incoming data:', {
      klant,
      email,
      telefoon,
      klantnummer,
      merk,
      model,
      notities,
      datum,
      jobId
    });
    
    console.log('🎨 Creating canvas (600x300)...');
    const canvas = createCanvas(600, 300);
    const ctx = canvas.getContext('2d');
    
    console.log('🖌️ Setting background to white...');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 300);
    
    console.log('✏️ Drawing text labels...');
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    
    ctx.fillText(`Klant: ${klant || '—'}`, 40, 50);
    ctx.fillText(`Job: ${jobId}`, 40, 90);
    ctx.fillText(`${merk || ''} ${model || ''}`, 40, 130);
    ctx.fillText(`Datum: ${datum || new Date().toLocaleString('nl-NL')}`, 40, 170);
    console.log('✅ Text labels drawn');
    
    console.log('📱 Generating QR code...');
    try {
      const qrDataURL = await QRCode.toDataURL(jobId, { width: 80, margin: 1 });
      const qrImage = await loadImage(qrDataURL);
      ctx.drawImage(qrImage, 500, 20, 80, 80);
      console.log('✅ QR code generated and drawn at top-right');
    } catch (err) {
      console.error('❌ QR code generation error:', err);
    }
    
    console.log('📊 Generating barcode...');
    try {
      const barcodePNG = bwipjs.toBuffer({
        bcid: 'code128',
        text: jobId,
        scale: 3,
        height: 50,
        includetext: false
      });
      const barcodeImage = await loadImage(barcodePNG);
      const barcodeWidth = barcodeImage.width;
      const xPos = (600 - barcodeWidth) / 2;
      ctx.drawImage(barcodeImage, xPos, 220, barcodeWidth, 50);
      console.log(`✅ Barcode generated and drawn at bottom-center (width: ${barcodeWidth})`);
    } catch (err) {
      console.error('❌ Barcode generation error:', err);
    }
    
    console.log('💾 Converting canvas to PNG buffer...');
    const buffer = canvas.toBuffer('image/png');
    console.log(`✅ Label rendered (buffer ${buffer.length} bytes)`);
    
    // Save debug PNG file
    const debugPath = 'debug_label.png';
    fs.writeFileSync(debugPath, buffer);
    console.log(`💾 DEBUG: Saved label to ${debugPath} for inspection`);
    
    // Get available printers
    console.log('🖨️ Checking available printers...');
    const availablePrinters = printer.getPrinters();
    console.log('📋 Available printers:', availablePrinters);
    
    // Try to match printer name or use first available
    let printerName = "NPI4790D0 (HP Color LaserJet MFP M181fw)";
    const printerMatch = availablePrinters.find(p => p.includes('HP') || p.includes('Brother'));
    
    if (printerMatch) {
      printerName = printerMatch;
      console.log(`🎯 Using matched printer: ${printerName}`);
    } else if (availablePrinters.length > 0) {
      printerName = availablePrinters[0];
      console.log(`⚠️ Using first available printer: ${printerName}`);
    } else {
      console.warn(`⚠️ No printers found, using configured name: ${printerName}`);
    }
    
    console.log(`🖨️ Sending print job to: ${printerName}`);
    console.log(`📦 Buffer size: ${buffer.length} bytes`);
    console.log(`📝 Type: RAW`);
    
    try {
      printer.printDirect({
        data: buffer,
        printer: printerName,
        type: 'RAW',
        success: () => {
          console.log(`✅ Print success for job ${jobId}`);
          res.json({
            success: true,
            message: 'Label printed',
            jobId
          });
        },
        error: (err) => {
          console.error(`❌ Print error: ${err.message || err}`);
          res.json({
            success: false,
            message: err.message || 'Print failed'
          });
        }
      });
    } catch (syncError) {
      console.error(`❌ Synchronous print error: ${syncError.message}`);
      res.status(500).json({
        success: false,
        message: 'Synchronous print error',
        error: syncError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing print request:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing print request',
      error: error.message
    });
  }
});

// Print part label endpoint
app.post('/print-part', async (req, res) => {
  console.log('\n=== POST /print-part received ===');
  
  try {
    const { text, jobId } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }
    
    console.log('📥 Incoming part label data:', { text, jobId });
    
    console.log('🎨 Creating canvas (600x200)...');
    const canvas = createCanvas(600, 200);
    const ctx = canvas.getContext('2d');
    
    console.log('🖌️ Setting background to white...');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 200);
    
    console.log('✏️ Drawing part label text...');
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Center the text
    ctx.fillText(text, 300, 80);
    console.log('✅ Part label text drawn');
    
    // Add QR code and barcode if jobId is provided
    if (jobId) {
      console.log('📱 Generating QR code...');
      try {
        const qrDataURL = await QRCode.toDataURL(jobId, { width: 50, margin: 1 });
        const qrImage = await loadImage(qrDataURL);
        ctx.drawImage(qrImage, 500, 10, 50, 50);
        console.log('✅ QR code generated and drawn at top-right');
      } catch (err) {
        console.error('❌ QR code generation error:', err);
      }
      
      console.log('📊 Generating barcode...');
      try {
        const barcodePNG = bwipjs.toBuffer({
          bcid: 'code128',
          text: jobId,
          scale: 2,
          height: 40,
          includetext: false
        });
        const barcodeImage = await loadImage(barcodePNG);
        const barcodeWidth = barcodeImage.width;
        const xPos = (600 - barcodeWidth) / 2;
        ctx.drawImage(barcodeImage, xPos, 130, barcodeWidth, 40);
        console.log(`✅ Barcode generated and drawn at bottom-center (width: ${barcodeWidth})`);
      } catch (err) {
        console.error('❌ Barcode generation error:', err);
      }
    }
    
    console.log('💾 Converting canvas to PNG buffer...');
    const buffer = canvas.toBuffer('image/png');
    console.log(`✅ Part label rendered (buffer ${buffer.length} bytes)`);
    
    // Save debug PNG file
    const debugPath = 'debug_part_label.png';
    fs.writeFileSync(debugPath, buffer);
    console.log(`💾 DEBUG: Saved part label to ${debugPath} for inspection`);
    
    // Get available printers
    console.log('🖨️ Checking available printers...');
    const availablePrinters = printer.getPrinters();
    console.log('📋 Available printers:', availablePrinters);
    
    // Try to match printer name or use first available
    let printerName = "NPI4790D0 (HP Color LaserJet MFP M181fw)";
    const printerMatch = availablePrinters.find(p => p.includes('HP') || p.includes('Brother'));
    
    if (printerMatch) {
      printerName = printerMatch;
      console.log(`🎯 Using matched printer: ${printerName}`);
    } else if (availablePrinters.length > 0) {
      printerName = availablePrinters[0];
      console.log(`⚠️ Using first available printer: ${printerName}`);
    } else {
      console.warn(`⚠️ No printers found, using configured name: ${printerName}`);
    }
    
    console.log(`🖨️ Sending print job to: ${printerName}`);
    console.log(`📦 Buffer size: ${buffer.length} bytes`);
    console.log(`📝 Type: RAW`);
    
    try {
      printer.printDirect({
        data: buffer,
        printer: printerName,
        type: 'RAW',
        success: () => {
          console.log(`✅ Part label print success`);
          res.json({
            success: true,
            message: 'Part label printed',
            text
          });
        },
        error: (err) => {
          console.error(`❌ Print error: ${err.message || err}`);
          res.json({
            success: false,
            message: err.message || 'Print failed'
          });
        }
      });
    } catch (syncError) {
      console.error(`❌ Synchronous print error: ${syncError.message}`);
      res.status(500).json({
        success: false,
        message: 'Synchronous print error',
        error: syncError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing part label print request:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing part label print request',
      error: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Print service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
