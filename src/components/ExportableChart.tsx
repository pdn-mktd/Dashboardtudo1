import { useRef, ReactNode } from 'react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ExportableChartProps {
    children: ReactNode;
    title: string;
    className?: string;
}

export function ExportableChart({ children, title, className = '' }: ExportableChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);

    const handleExport = async () => {
        if (!chartRef.current) return;

        try {
            // Create a clone to add the watermark
            const clone = chartRef.current.cloneNode(true) as HTMLDivElement;

            // Add watermark element
            const watermark = document.createElement('div');
            watermark.style.position = 'absolute';
            watermark.style.bottom = '8px';
            watermark.style.right = '12px';
            watermark.style.fontSize = '11px';
            watermark.style.color = 'rgba(255, 255, 255, 0.5)';
            watermark.style.fontFamily = 'Inter, sans-serif';
            watermark.style.letterSpacing = '0.5px';
            watermark.textContent = 'feito por tudo1';

            // Create a container for export
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.display = 'inline-block';
            container.style.background = getComputedStyle(chartRef.current).backgroundColor || '#0f172a';
            container.appendChild(clone);
            container.appendChild(watermark);
            document.body.appendChild(container);

            const dataUrl = await toPng(container, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: getComputedStyle(chartRef.current).backgroundColor || '#0f172a',
            });

            document.body.removeChild(container);

            // Download
            const link = document.createElement('a');
            link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();

            toast({ title: 'Gráfico exportado com sucesso!' });
        } catch (error) {
            console.error('Error exporting chart:', error);
            toast({ title: 'Erro ao exportar gráfico', variant: 'destructive' });
        }
    };

    return (
        <div className={`relative group ${className}`}>
            <div ref={chartRef} className="relative">
                {children}
                {/* Watermark visible in the chart */}
                <div className="absolute bottom-2 right-3 text-[11px] text-muted-foreground/40 font-medium tracking-wide pointer-events-none">
                    feito por tudo1
                </div>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1.5 h-8 text-xs"
                onClick={handleExport}
            >
                <Download className="h-3.5 w-3.5" />
                Exportar PNG
            </Button>
        </div>
    );
}
