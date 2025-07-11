'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useStore } from '@/contexts/store-context'
import { productSchema } from '@/utils/validation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Upload, 
  Download, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react'
import { formatPrice } from '@/utils/currency'
import { toast } from 'sonner'

interface BulkOperationsDialogProps {
  open: boolean
  onClose: () => void
}

interface CSVError {
  row: number
  field: string
  message: string
}

interface ImportResult {
  success: number
  errors: CSVError[]
  total: number
}

export function BulkOperationsDialog({ open, onClose }: BulkOperationsDialogProps) {
  const [activeTab, setActiveTab] = useState('import')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<CSVError[]>([])
  const [progress, setProgress] = useState(0)
  
  // Bulk edit states
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [bulkEditAction, setBulkEditAction] = useState<string>('')
  const [bulkPriceChange, setBulkPriceChange] = useState<{type: 'percentage' | 'fixed', value: number}>({type: 'percentage', value: 0})
  const [bulkCategory, setBulkCategory] = useState<string>('')
  const [bulkStatus, setBulkStatus] = useState<boolean | null>(null)
  const [bulkEditing, setBulkEditing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { products, createProduct, updateProduct } = useProducts()
  const { categories } = useCategories()
  const { currentStore } = useStore()

  // CSV template headers
  const csvHeaders = [
    'name',
    'description', 
    'sku',
    'barcode',
    'price',
    'cost',
    'category_name',
    'weight',
    'is_active',
    'is_featured',
    'track_inventory',
    'tax_exempt',
    'tags'
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setValidationErrors([])
      setImportResult(null)
    } else {
      toast.error('Please select a valid CSV file')
    }
  }

  const validateCSVRow = (row: any, rowIndex: number, categories: any[]): CSVError[] => {
    const errors: CSVError[] = []
    
    // Required fields validation
    if (!row.name?.trim()) {
      errors.push({
        row: rowIndex + 1,
        field: 'name',
        message: 'Product name is required'
      })
    }

    // Price validation
    const price = parseFloat(row.price)
    if (isNaN(price) || price < 0) {
      errors.push({
        row: rowIndex + 1,
        field: 'price',
        message: 'Valid price is required (must be >= 0)'
      })
    }

    // Category validation
    if (row.category_name && !categories.find(c => c.name.toLowerCase() === row.category_name.toLowerCase())) {
      errors.push({
        row: rowIndex + 1,
        field: 'category_name',
        message: `Category "${row.category_name}" not found`
      })
    }

    // Boolean field validation
    const booleanFields = ['is_active', 'is_featured', 'track_inventory', 'tax_exempt']
    booleanFields.forEach(field => {
      if (row[field] && !['true', 'false', '1', '0', 'yes', 'no'].includes(row[field].toLowerCase())) {
        errors.push({
          row: rowIndex + 1,
          field,
          message: `${field} must be true/false or yes/no`
        })
      }
    })

    return errors
  }

  const parseBooleanValue = (value: string): boolean => {
    if (!value) return false
    const normalizedValue = value.toLowerCase().trim()
    return ['true', '1', 'yes'].includes(normalizedValue)
  }

  const handleImport = async () => {
    if (!csvFile || !currentStore) return

    setImporting(true)
    setProgress(0)

    try {
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const csvData = results.data as any[]
          const allErrors: CSVError[] = []
          let successCount = 0

          // Validate all rows first
          csvData.forEach((row, index) => {
            const rowErrors = validateCSVRow(row, index, categories)
            allErrors.push(...rowErrors)
          })

          if (allErrors.length > 0) {
            setValidationErrors(allErrors)
            setImporting(false)
            return
          }

          // Process valid rows
          for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i]
            try {
              // Find category by name
              const category = row.category_name 
                ? categories.find(c => c.name.toLowerCase() === row.category_name.toLowerCase())
                : null

              // Parse tags
              const tags = row.tags ? row.tags.split(',').map((tag: string) => tag.trim()) : []

              const productData = {
                name: row.name.trim(),
                description: row.description?.trim() || undefined,
                sku: row.sku?.trim() || undefined,
                barcode: row.barcode?.trim() || undefined,
                price: parseFloat(row.price),
                cost: row.cost ? parseFloat(row.cost) : undefined,
                category_id: category?.id || undefined,
                weight: row.weight ? parseFloat(row.weight) : undefined,
                is_active: row.is_active ? parseBooleanValue(row.is_active) : true,
                is_featured: row.is_featured ? parseBooleanValue(row.is_featured) : false,
                track_inventory: row.track_inventory ? parseBooleanValue(row.track_inventory) : true,
                tax_exempt: row.tax_exempt ? parseBooleanValue(row.tax_exempt) : false,
                tags,
                store_id: currentStore.id
              }

              await createProduct(productData)
              successCount++
              setProgress(((i + 1) / csvData.length) * 100)
            } catch (error) {
              allErrors.push({
                row: i + 1,
                field: 'general',
                message: error instanceof Error ? error.message : 'Failed to create product'
              })
            }
          }

          setImportResult({
            success: successCount,
            errors: allErrors,
            total: csvData.length
          })
          
          if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} product${successCount === 1 ? '' : 's'}`)
          }
          if (allErrors.length > 0) {
            toast.error(`${allErrors.length} product${allErrors.length === 1 ? '' : 's'} failed to import`)
          }
          
          setImporting(false)
        }
      })
    } catch (error) {
      console.error('Import error:', error)
      setImporting(false)
    }
  }

  const handleExport = async () => {
    if (!products.length) {
      toast.error('No products to export')
      return
    }

    setExporting(true)

    try {
      const csvData = products.map(product => ({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.price,
        cost: product.cost || '',
        category_name: product.category?.name || '',
        weight: product.weight || '',
        is_active: product.is_active,
        is_featured: product.is_featured,
        track_inventory: product.track_inventory,
        tax_exempt: product.tax_exempt,
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : ''
      }))

      const csv = Papa.unparse(csvData, {
        header: true
      })

      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `products-${currentStore?.name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      
      toast.success(`Successfully exported ${products.length} product${products.length === 1 ? '' : 's'}`)
      setExporting(false)
    } catch (error) {
      console.error('Export error:', error)
      setExporting(false)
    }
  }

  const downloadTemplate = () => {
    const templateData = [{
      name: 'Sample Product',
      description: 'This is a sample product description',
      sku: 'SKU001',
      barcode: '1234567890123',
      price: '19.99',
      cost: '10.00',
      category_name: 'Electronics',
      weight: '0.5',
      is_active: 'true',
      is_featured: 'false',
      track_inventory: 'true',
      tax_exempt: 'false',
      tags: 'sample, electronic, gadget'
    }]

    const csv = Papa.unparse(templateData, { header: true })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'product-import-template.csv'
    link.click()
  }

  const resetImport = () => {
    setCsvFile(null)
    setImportResult(null)
    setValidationErrors([])
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBulkEdit = async () => {
    if (selectedProducts.length === 0 || !bulkEditAction) return

    setBulkEditing(true)
    setProgress(0)

    try {
      for (let i = 0; i < selectedProducts.length; i++) {
        const productId = selectedProducts[i]
        let updateData: any = {}

        switch (bulkEditAction) {
          case 'price':
            const currentProduct = products.find(p => p.id === productId)
            if (currentProduct) {
              if (bulkPriceChange.type === 'percentage') {
                const newPrice = currentProduct.price * (1 + bulkPriceChange.value / 100)
                updateData.price = Math.round(newPrice * 100) / 100 // Round to 2 decimal places
              } else {
                updateData.price = Math.max(0, currentProduct.price + bulkPriceChange.value)
              }
            }
            break
          case 'category':
            if (bulkCategory) {
              updateData.category_id = bulkCategory
            }
            break
          case 'status':
            if (bulkStatus !== null) {
              updateData.is_active = bulkStatus
            }
            break
        }

        if (Object.keys(updateData).length > 0) {
          await updateProduct(productId, updateData)
        }
        
        setProgress(((i + 1) / selectedProducts.length) * 100)
      }

      // Reset form
      setSelectedProducts([])
      setBulkEditAction('')
      setBulkPriceChange({type: 'percentage', value: 0})
      setBulkCategory('')
      setBulkStatus(null)
      
      toast.success(`Successfully updated ${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'}`)
      
    } catch (error) {
      console.error('Bulk edit error:', error)
      toast.error('Failed to update some products')
    } finally {
      setBulkEditing(false)
      setProgress(0)
    }
  }

  const handleProductSelection = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Product Operations</DialogTitle>
          <DialogDescription>
            Import or export products in bulk using CSV files
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Import Products</TabsTrigger>
            <TabsTrigger value="export">Export Products</TabsTrigger>
            <TabsTrigger value="bulk-edit">Bulk Edit</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>CSV File</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
              
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={importing}
              />

              {csvFile && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Selected file: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}

              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing products...</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>Found {validationErrors.length} validation errors:</p>
                      <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                        {validationErrors.slice(0, 10).map((error, index) => (
                          <li key={index}>
                            Row {error.row}, {error.field}: {error.message}
                          </li>
                        ))}
                        {validationErrors.length > 10 && (
                          <li>... and {validationErrors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {importResult && (
                <Alert variant={importResult.errors.length > 0 ? "destructive" : "default"}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>Import completed:</p>
                      <ul className="text-sm space-y-1">
                        <li>✅ Successfully imported: {importResult.success} products</li>
                        {importResult.errors.length > 0 && (
                          <li>❌ Failed: {importResult.errors.length} products</li>
                        )}
                        <li>📊 Total processed: {importResult.total} rows</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetImport} disabled={importing}>
                Reset
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!csvFile || importing || validationErrors.length > 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Products
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Export {products.length} products from your current store as a CSV file.
                  This includes all product details including categories and pricing.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Export includes:</Label>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Product name, description, SKU, barcode</li>
                  <li>• Pricing and cost information</li>
                  <li>• Category assignments</li>
                  <li>• Product status, tax settings, and features</li>
                  <li>• Tags and weight information</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={exporting || products.length === 0}
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Products
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk-edit" className="space-y-4">
            <div className="space-y-4">
              {/* Product Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Products to Edit</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label className="text-sm">Select All ({products.length} products)</Label>
                  </div>
                </div>
                
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  {products.map(product => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleProductSelection(product.id, !!checked)}
                      />
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{product.name}</span>
                        {product.sku && <span className="text-muted-foreground ml-2">({product.sku})</span>}
                        <span className="ml-2">{formatPrice(product.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedProducts.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected for bulk editing
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Bulk Action Selection */}
              <div className="space-y-3">
                <Label>Bulk Action</Label>
                <Select value={bulkEditAction} onValueChange={setBulkEditAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose what to edit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Update Prices</SelectItem>
                    <SelectItem value="category">Change Category</SelectItem>
                    <SelectItem value="status">Change Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Update Options */}
              {bulkEditAction === 'price' && (
                <div className="space-y-3 p-3 bg-muted rounded-md">
                  <Label>Price Change</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={bulkPriceChange.type} 
                      onValueChange={(value: 'percentage' | 'fixed') => 
                        setBulkPriceChange(prev => ({...prev, type: value}))
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder={bulkPriceChange.type === 'percentage' ? 'e.g., 10 for +10%' : 'e.g., 5.00'}
                      value={bulkPriceChange.value || ''}
                      onChange={(e) => setBulkPriceChange(prev => ({...prev, value: parseFloat(e.target.value) || 0}))}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {bulkPriceChange.type === 'percentage' 
                      ? 'Enter percentage change (positive for increase, negative for decrease)'
                      : 'Enter fixed amount to add/subtract from current price'
                    }
                  </p>
                </div>
              )}

              {/* Category Change Options */}
              {bulkEditAction === 'category' && (
                <div className="space-y-3 p-3 bg-muted rounded-md">
                  <Label>New Category</Label>
                  <Select value={bulkCategory} onValueChange={setBulkCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Category</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Change Options */}
              {bulkEditAction === 'status' && (
                <div className="space-y-3 p-3 bg-muted rounded-md">
                  <Label>New Status</Label>
                  <Select 
                    value={bulkStatus === null ? '' : bulkStatus.toString()} 
                    onValueChange={(value) => setBulkStatus(value === 'true')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Progress Indicator */}
              {bulkEditing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating {selectedProducts.length} products...</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={bulkEditing}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkEdit} 
                disabled={selectedProducts.length === 0 || !bulkEditAction || bulkEditing}
              >
                {bulkEditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Update ${selectedProducts.length} Product${selectedProducts.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}