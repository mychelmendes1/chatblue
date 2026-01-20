import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { EmbeddingService } from '../services/knowledge/embedding.service.js';

// Get project root (apps/api/src/scripts -> apps/api -> project root)
// Using process.cwd() which should be the project root when running from package.json script
const projectRoot = process.cwd();

interface FileInfo {
  path: string;
  content: string;
  type: 'component' | 'route' | 'service' | 'util' | 'type' | 'config' | 'other';
}

/**
 * Determine file type based on path
 */
function getFileType(filePath: string): FileInfo['type'] {
  const relativePath = path.relative(projectRoot, filePath);
  
  if (relativePath.includes('/components/') || relativePath.includes('/components/')) {
    return 'component';
  }
  if (relativePath.includes('/routes/') || relativePath.match(/route/)) {
    return 'route';
  }
  if (relativePath.includes('/services/')) {
    return 'service';
  }
  if (relativePath.includes('/utils/') || relativePath.includes('/utils/')) {
    return 'util';
  }
  if (relativePath.includes('/types/') || relativePath.match(/\.types\./)) {
    return 'type';
  }
  if (relativePath.includes('/config/')) {
    return 'config';
  }
  return 'other';
}

/**
 * Read and parse TypeScript/TSX file
 */
function readCodeFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Error reading file ${filePath}:`, error);
    return '';
  }
}

/**
 * Extract code metadata (imports, exports, functions, classes)
 */
function extractCodeMetadata(content: string, filePath: string): string {
  const lines = content.split('\n');
  const metadata: string[] = [];
  
  // Extract imports
  const imports = lines
    .filter((line) => line.trim().startsWith('import '))
    .slice(0, 10) // Limit to first 10 imports
    .join('\n');
  if (imports) {
    metadata.push(`Imports:\n${imports}`);
  }

  // Extract exports (functions, classes, constants)
  const exports = lines
    .filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('export ') &&
        (trimmed.includes('function ') ||
          trimmed.includes('class ') ||
          trimmed.includes('const ') ||
          trimmed.includes('interface ') ||
          trimmed.includes('type '))
      );
    })
    .slice(0, 10) // Limit to first 10 exports
    .join('\n');
  if (exports) {
    metadata.push(`Exports:\n${exports}`);
  }

  return metadata.join('\n\n');
}

/**
 * Find all TypeScript/TSX files in a directory
 */
function findCodeFiles(
  dir: string,
  excludeDirs: string[] = ['node_modules', '.next', 'dist', 'build', '.git', 'coverage']
): FileInfo[] {
  const files: FileInfo[] = [];

  function traverse(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip excluded directories
        if (entry.isDirectory()) {
          const shouldExclude = excludeDirs.some((excluded) =>
            fullPath.includes(excluded)
          );
          if (!shouldExclude) {
            traverse(fullPath);
          }
          continue;
        }

        // Process TypeScript/TSX files
        if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          const content = readCodeFile(fullPath);
          if (content) {
            const relativePath = path.relative(projectRoot, fullPath);
            files.push({
              path: relativePath,
              content,
              type: getFileType(fullPath),
            });
          }
        }
      }
    } catch (error) {
      logger.warn(`Error traversing directory ${currentDir}:`, error);
    }
  }

  traverse(dir);
  return files;
}

/**
 * Chunk content with overlap
 */
function chunkContent(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    chunks.push(content.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Main ingestion function
 */
async function ingestCodebase(companyId: string, aiProvider?: string, aiApiKey?: string) {
  try {
    logger.info(`Starting codebase ingestion for company ${companyId}`);

    // Get or create system-code context
    let codeContext = await prisma.knowledgeContext.findFirst({
      where: {
        companyId,
        slug: 'system-code',
      },
    });

    if (!codeContext) {
      codeContext = await prisma.knowledgeContext.create({
        data: {
          name: 'System Codebase',
          description: 'Codebase source code for AI assistance',
          slug: 'system-code',
          keywords: ['code', 'source', 'component', 'service', 'route', 'function'],
          priority: 100, // High priority
          companyId,
        },
      });
      logger.info(`Created system-code context: ${codeContext.id}`);
    }

    // Find all code files (apps/api and apps/web)
    // Assuming we're running from project root (apps/api/src/scripts -> apps/api -> project root)
    const apiDir = path.join(projectRoot, 'apps', 'api', 'src');
    const webDir = path.join(projectRoot, 'apps', 'web');

    logger.info('Scanning codebase files...');
    const apiFiles = fs.existsSync(apiDir) ? findCodeFiles(apiDir) : [];
    const webFiles = fs.existsSync(webDir) ? findCodeFiles(webDir) : [];
    const allFiles = [...apiFiles, ...webFiles];

    logger.info(`Found ${allFiles.length} code files`);

    if (allFiles.length === 0) {
      logger.warn('No code files found to ingest');
      return;
    }

    // Group files by type for better organization
    const filesByType = new Map<FileInfo['type'], FileInfo[]>();
    for (const file of allFiles) {
      if (!filesByType.has(file.type)) {
        filesByType.set(file.type, []);
      }
      filesByType.get(file.type)!.push(file);
    }

    // Process files in batches
    const batchSize = 10;
    let processed = 0;

    for (const [type, files] of filesByType.entries()) {
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        for (const file of batch) {
          try {
            // Create or update source
            const sourceName = `${type}/${path.basename(file.path)}`;
            let source = await prisma.knowledgeSource.findFirst({
              where: {
                contextId: codeContext.id,
                name: sourceName,
              },
            });

            if (source) {
              // Update existing source
              await prisma.knowledgeSource.update({
                where: { id: source.id },
                data: {
                  status: 'PROCESSING',
                  content: file.content,
                  metadata: {
                    type: file.type,
                    path: file.path,
                    updatedAt: new Date().toISOString(),
                  },
                },
              });
              
              // Delete old chunks
              await prisma.knowledgeChunk.deleteMany({
                where: { sourceId: source.id },
              });
            } else {
              // Create new source
              source = await prisma.knowledgeSource.create({
                data: {
                  name: sourceName,
                  type: 'TEXT',
                  contextId: codeContext.id,
                  companyId,
                  status: 'PROCESSING',
                  content: file.content,
                  metadata: {
                    type: file.type,
                    path: file.path,
                  },
                },
              });
            }

            // Create chunks
            const chunks = chunkContent(file.content, 1000, 200);
            const chunkRecords = [];

            // Generate embeddings if API key is available
            if (aiApiKey && aiProvider) {
              const embeddingService = new EmbeddingService(aiProvider as any, aiApiKey);
              
              for (let j = 0; j < chunks.length; j++) {
                try {
                  const chunkContent = chunks[j];
                  const embedding = await embeddingService.generateEmbedding(
                    `${extractCodeMetadata(file.content, file.path)}\n\n${chunkContent}`
                  );
                  
                  chunkRecords.push({
                    content: chunkContent,
                    embedding: JSON.stringify(embedding),
                    sourceId: source.id,
                    metadata: {
                      chunkIndex: j,
                      filePath: file.path,
                      fileType: file.type,
                    },
                  });

                  // Small delay to avoid rate limits
                  if (j % 10 === 0 && j > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                  }
                } catch (error) {
                  logger.warn(`Error generating embedding for chunk ${j} of ${sourceName}:`, error);
                  // Create chunk without embedding
                  chunkRecords.push({
                    content: chunks[j],
                    embedding: null,
                    sourceId: source.id,
                    metadata: {
                      chunkIndex: j,
                      filePath: file.path,
                      fileType: file.type,
                    },
                  });
                }
              }
            } else {
              // Create chunks without embeddings
              chunkRecords.push(
                ...chunks.map((chunkContent, j) => ({
                  content: chunkContent,
                  embedding: null,
                  sourceId: source.id,
                  metadata: {
                    chunkIndex: j,
                    filePath: file.path,
                    fileType: file.type,
                  },
                }))
              );
            }

            // Insert chunks
            await prisma.knowledgeChunk.createMany({
              data: chunkRecords,
            });

            // Update source status
            await prisma.knowledgeSource.update({
              where: { id: source.id },
              data: {
                status: 'COMPLETED',
              },
            });

            processed++;
            if (processed % 10 === 0) {
              logger.info(`Processed ${processed}/${allFiles.length} files...`);
            }
          } catch (error) {
            logger.error(`Error processing file ${file.path}:`, error);
          }
        }
      }
    }

    logger.info(`Codebase ingestion completed. Processed ${processed} files.`);
  } catch (error) {
    logger.error('Error in codebase ingestion:', error);
    throw error;
  }
}

// CLI execution
// @ts-ignore - import.meta.url is valid in ESM
if ((import.meta as any).url === `file://${process.argv[1]}`) {
  const companyId = process.argv[2];
  const aiProvider = process.argv[3] || 'openai';
  const aiApiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!companyId) {
    console.error('Usage: tsx ingest-codebase.ts <companyId> [aiProvider]');
    process.exit(1);
  }

  ingestCodebase(companyId, aiProvider, aiApiKey)
    .then(() => {
      logger.info('Ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Ingestion failed:', error);
      process.exit(1);
    });
}

export { ingestCodebase };

