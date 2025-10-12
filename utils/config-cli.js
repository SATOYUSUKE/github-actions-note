#!/usr/bin/env node

/**
 * 設定管理CLI ツール
 * コマンドラインから設定の表示、更新、検証、エクスポート/インポートを行う
 */

import { Logger } from './logger.js';
import { globalConfig } from './config-manager.js';
import { globalPromptManager, PromptTypes } from './prompt-manager.js';
import { globalValidator } from './config-validator.js';
import { FileManager } from './file-manager.js';
import readline from 'readline';

/**
 * CLI コマンドクラス
 */
class ConfigCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * メイン実行関数
   */
  async run() {
    try {
      console.log('🔧 Note Automation Configuration Manager');
      console.log('=====================================\n');

      // 設定システムを初期化
      await this.initializeSystems();

      // メインメニューを表示
      await this.showMainMenu();

    } catch (error) {
      console.error('❌ CLI execution failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  /**
   * システムを初期化
   */
  async initializeSystems() {
    try {
      console.log('🚀 Initializing configuration systems...');
      await globalConfig.initialize();
      await globalPromptManager.initialize();
      console.log('✅ Configuration systems initialized\n');
    } catch (error) {
      console.error('❌ Failed to initialize systems:', error.message);
      throw error;
    }
  }

  /**
   * メインメニューを表示
   */
  async showMainMenu() {
    while (true) {
      console.log('\n📋 Main Menu:');
      console.log('1. View Configuration');
      console.log('2. Update Configuration');
      console.log('3. Validate Configuration');
      console.log('4. Manage Prompt Templates');
      console.log('5. Export Configuration');
      console.log('6. Import Configuration');
      console.log('7. Reset Configuration');
      console.log('8. Configuration Health Check');
      console.log('0. Exit');

      const choice = await this.prompt('\n🔹 Select an option: ');

      switch (choice) {
        case '1':
          await this.viewConfiguration();
          break;
        case '2':
          await this.updateConfiguration();
          break;
        case '3':
          await this.validateConfiguration();
          break;
        case '4':
          await this.managePromptTemplates();
          break;
        case '5':
          await this.exportConfiguration();
          break;
        case '6':
          await this.importConfiguration();
          break;
        case '7':
          await this.resetConfiguration();
          break;
        case '8':
          await this.performHealthCheck();
          break;
        case '0':
          console.log('\n👋 Goodbye!');
          return;
        default:
          console.log('❌ Invalid option. Please try again.');
      }
    }
  }

  /**
   * 設定を表示
   */
  async viewConfiguration() {
    console.log('\n📊 Configuration Overview:');
    console.log('========================\n');

    try {
      const summary = globalConfig.getConfigSummary();
      
      console.log(`📈 Total Settings: ${summary.totalSettings}`);
      console.log(`🎨 Customized Categories: ${summary.customizations}/${summary.categories.length}`);
      console.log('');

      for (const category of summary.categories) {
        const status = category.hasCustomizations ? '🎨 Customized' : '📋 Default';
        console.log(`${status} ${category.name}: ${category.settingsCount} settings`);
      }

      console.log('\n🔍 Select a category to view details:');
      summary.categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}`);
      });
      console.log('0. Back to main menu');

      const choice = await this.prompt('\n🔹 Select category: ');
      const categoryIndex = parseInt(choice) - 1;

      if (choice === '0') {
        return;
      }

      if (categoryIndex >= 0 && categoryIndex < summary.categories.length) {
        const category = summary.categories[categoryIndex];
        await this.viewCategoryDetails(category.name);
      } else {
        console.log('❌ Invalid category selection.');
      }

    } catch (error) {
      console.error('❌ Failed to view configuration:', error.message);
    }
  }

  /**
   * カテゴリ詳細を表示
   */
  async viewCategoryDetails(categoryName) {
    try {
      const config = globalConfig.getConfig(categoryName);
      
      console.log(`\n📋 ${categoryName.toUpperCase()} Configuration:`);
      console.log('='.repeat(40));
      console.log(JSON.stringify(config, null, 2));
      
      await this.prompt('\n📱 Press Enter to continue...');
      
    } catch (error) {
      console.error(`❌ Failed to view ${categoryName} configuration:`, error.message);
    }
  }

  /**
   * 設定を更新
   */
  async updateConfiguration() {
    console.log('\n✏️ Update Configuration:');
    console.log('=======================\n');

    try {
      const summary = globalConfig.getConfigSummary();
      
      console.log('📋 Available categories:');
      summary.categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}`);
      });
      console.log('0. Back to main menu');

      const choice = await this.prompt('\n🔹 Select category to update: ');
      const categoryIndex = parseInt(choice) - 1;

      if (choice === '0') {
        return;
      }

      if (categoryIndex >= 0 && categoryIndex < summary.categories.length) {
        const category = summary.categories[categoryIndex];
        await this.updateCategoryConfiguration(category.name);
      } else {
        console.log('❌ Invalid category selection.');
      }

    } catch (error) {
      console.error('❌ Failed to update configuration:', error.message);
    }
  }

  /**
   * カテゴリ設定を更新
   */
  async updateCategoryConfiguration(categoryName) {
    try {
      console.log(`\n✏️ Updating ${categoryName.toUpperCase()} Configuration:`);
      console.log('='.repeat(50));

      const config = globalConfig.getConfig(categoryName);
      console.log('\n📋 Current configuration:');
      console.log(JSON.stringify(config, null, 2));

      console.log('\n🔧 Update options:');
      console.log('1. Update specific field');
      console.log('2. Replace entire configuration');
      console.log('0. Back');

      const choice = await this.prompt('\n🔹 Select update method: ');

      switch (choice) {
        case '1':
          await this.updateSpecificField(categoryName);
          break;
        case '2':
          await this.replaceConfiguration(categoryName);
          break;
        case '0':
          return;
        default:
          console.log('❌ Invalid option.');
      }

    } catch (error) {
      console.error(`❌ Failed to update ${categoryName} configuration:`, error.message);
    }
  }

  /**
   * 特定フィールドを更新
   */
  async updateSpecificField(categoryName) {
    try {
      const fieldPath = await this.prompt('🔹 Enter field path (e.g., api.anthropic.temperature): ');
      const currentValue = globalConfig.getConfig(categoryName, fieldPath);
      
      console.log(`📋 Current value: ${JSON.stringify(currentValue)}`);
      
      const newValueStr = await this.prompt('🔹 Enter new value: ');
      let newValue;
      
      try {
        newValue = JSON.parse(newValueStr);
      } catch {
        newValue = newValueStr; // 文字列として扱う
      }

      await globalConfig.updateConfig(categoryName, fieldPath, newValue);
      console.log('✅ Configuration updated successfully!');

    } catch (error) {
      console.error('❌ Failed to update field:', error.message);
    }
  }

  /**
   * 設定全体を置換
   */
  async replaceConfiguration(categoryName) {
    try {
      console.log('⚠️  This will replace the entire configuration.');
      const confirm = await this.prompt('🔹 Continue? (y/N): ');
      
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ Operation cancelled.');
        return;
      }

      console.log('📝 Enter new configuration (JSON format):');
      console.log('(Type "END" on a new line when finished)');
      
      let configJson = '';
      while (true) {
        const line = await this.prompt('');
        if (line === 'END') break;
        configJson += line + '\n';
      }

      const newConfig = JSON.parse(configJson);
      
      // 設定を検証
      const validation = globalValidator.validateConfig(newConfig, null, { category: categoryName });
      if (!validation.valid) {
        console.log('❌ Configuration validation failed:');
        validation.errors.forEach(error => console.log(`  - ${error.message}`));
        return;
      }

      // 設定を更新（実装が必要）
      console.log('✅ Configuration would be updated (implementation needed)');

    } catch (error) {
      console.error('❌ Failed to replace configuration:', error.message);
    }
  }

  /**
   * 設定を検証
   */
  async validateConfiguration() {
    console.log('\n🔍 Configuration Validation:');
    console.log('===========================\n');

    try {
      const summary = globalConfig.getConfigSummary();
      let totalErrors = 0;
      let totalWarnings = 0;

      for (const category of summary.categories) {
        console.log(`🔍 Validating ${category.name}...`);
        
        const config = globalConfig.getConfig(category.name);
        const validation = globalValidator.validateConfig(config, null, { category: category.name });
        
        if (validation.valid) {
          console.log(`  ✅ ${category.name}: Valid`);
        } else {
          console.log(`  ❌ ${category.name}: ${validation.errors.length} errors`);
          validation.errors.forEach(error => {
            console.log(`    - ${error.message}`);
          });
        }

        if (validation.warnings.length > 0) {
          console.log(`  ⚠️  ${category.name}: ${validation.warnings.length} warnings`);
          validation.warnings.forEach(warning => {
            console.log(`    - ${warning.message}`);
          });
        }

        totalErrors += validation.errors.length;
        totalWarnings += validation.warnings.length;
      }

      console.log('\n📊 Validation Summary:');
      console.log(`  Errors: ${totalErrors}`);
      console.log(`  Warnings: ${totalWarnings}`);
      
      if (totalErrors === 0) {
        console.log('✅ All configurations are valid!');
      } else {
        console.log('❌ Some configurations have errors that need to be fixed.');
      }

      await this.prompt('\n📱 Press Enter to continue...');

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }
  }

  /**
   * プロンプトテンプレートを管理
   */
  async managePromptTemplates() {
    console.log('\n📝 Prompt Template Management:');
    console.log('=============================\n');

    while (true) {
      console.log('📋 Template Management Options:');
      console.log('1. List Templates');
      console.log('2. View Template');
      console.log('3. Update Template');
      console.log('4. Reset Template');
      console.log('5. Export Templates');
      console.log('6. Import Templates');
      console.log('0. Back to main menu');

      const choice = await this.prompt('\n🔹 Select option: ');

      switch (choice) {
        case '1':
          await this.listTemplates();
          break;
        case '2':
          await this.viewTemplate();
          break;
        case '3':
          await this.updateTemplate();
          break;
        case '4':
          await this.resetTemplate();
          break;
        case '5':
          await this.exportTemplates();
          break;
        case '6':
          await this.importTemplates();
          break;
        case '0':
          return;
        default:
          console.log('❌ Invalid option.');
      }
    }
  }

  /**
   * テンプレート一覧を表示
   */
  async listTemplates() {
    try {
      const templates = globalPromptManager.getTemplateList();
      
      console.log('\n📋 Available Templates:');
      console.log('======================');
      
      templates.forEach((template, index) => {
        const status = template.hasCustomization ? '🎨' : '📋';
        console.log(`${index + 1}. ${status} ${template.name} (${template.type}) v${template.version}`);
        console.log(`   ${template.description}`);
        console.log(`   Variables: ${template.variables.join(', ')}`);
        console.log('');
      });

      await this.prompt('📱 Press Enter to continue...');

    } catch (error) {
      console.error('❌ Failed to list templates:', error.message);
    }
  }

  /**
   * テンプレートを表示
   */
  async viewTemplate() {
    try {
      const templates = globalPromptManager.getTemplateList();
      
      console.log('\n📋 Select template to view:');
      templates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name} (${template.type})`);
      });
      console.log('0. Back');

      const choice = await this.prompt('\n🔹 Select template: ');
      const templateIndex = parseInt(choice) - 1;

      if (choice === '0') return;

      if (templateIndex >= 0 && templateIndex < templates.length) {
        const template = templates[templateIndex];
        const prompt = globalPromptManager.generatePrompt(template.type);
        
        console.log(`\n📝 Template: ${template.name}`);
        console.log('='.repeat(50));
        console.log(prompt);
        
        await this.prompt('\n📱 Press Enter to continue...');
      } else {
        console.log('❌ Invalid template selection.');
      }

    } catch (error) {
      console.error('❌ Failed to view template:', error.message);
    }
  }

  /**
   * 設定をエクスポート
   */
  async exportConfiguration() {
    try {
      console.log('\n📤 Export Configuration:');
      console.log('=======================\n');

      const exportPath = await globalConfig.exportConfig();
      console.log(`✅ Configuration exported to: ${exportPath}`);

      await this.prompt('\n📱 Press Enter to continue...');

    } catch (error) {
      console.error('❌ Export failed:', error.message);
    }
  }

  /**
   * 設定をインポート
   */
  async importConfiguration() {
    try {
      console.log('\n📥 Import Configuration:');
      console.log('=======================\n');

      const importPath = await this.prompt('🔹 Enter import file path: ');
      
      console.log('⚠️  This will overwrite existing configurations.');
      const confirm = await this.prompt('🔹 Continue? (y/N): ');
      
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ Import cancelled.');
        return;
      }

      await globalConfig.importConfig(importPath);
      console.log('✅ Configuration imported successfully!');

      await this.prompt('\n📱 Press Enter to continue...');

    } catch (error) {
      console.error('❌ Import failed:', error.message);
    }
  }

  /**
   * 設定をリセット
   */
  async resetConfiguration() {
    try {
      console.log('\n🔄 Reset Configuration:');
      console.log('======================\n');

      const summary = globalConfig.getConfigSummary();
      
      console.log('📋 Available categories:');
      summary.categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}`);
      });
      console.log('0. Back');

      const choice = await this.prompt('\n🔹 Select category to reset: ');
      const categoryIndex = parseInt(choice) - 1;

      if (choice === '0') return;

      if (categoryIndex >= 0 && categoryIndex < summary.categories.length) {
        const category = summary.categories[categoryIndex];
        
        console.log(`⚠️  This will reset ${category.name} to default settings.`);
        const confirm = await this.prompt('🔹 Continue? (y/N): ');
        
        if (confirm.toLowerCase() === 'y') {
          await globalConfig.resetConfig(category.name);
          console.log(`✅ ${category.name} configuration reset to defaults.`);
        } else {
          console.log('❌ Reset cancelled.');
        }
      } else {
        console.log('❌ Invalid category selection.');
      }

      await this.prompt('\n📱 Press Enter to continue...');

    } catch (error) {
      console.error('❌ Reset failed:', error.message);
    }
  }

  /**
   * ヘルスチェックを実行
   */
  async performHealthCheck() {
    try {
      console.log('\n🏥 Configuration Health Check:');
      console.log('=============================\n');

      const summary = globalConfig.getConfigSummary();
      let totalIssues = 0;

      for (const category of summary.categories) {
        console.log(`🔍 Checking ${category.name}...`);
        
        const config = globalConfig.getConfig(category.name);
        const healthCheck = globalValidator.performHealthCheck(config, { category: category.name });
        
        const issueCount = healthCheck.getIssueCount();
        totalIssues += issueCount.total;

        if (issueCount.total === 0) {
          console.log(`  ✅ ${category.name}: Healthy`);
        } else {
          console.log(`  ⚠️  ${category.name}: ${issueCount.total} issues found`);
          
          healthCheck.errors.forEach(error => {
            console.log(`    ❌ ${error.message}`);
          });
          
          healthCheck.warnings.forEach(warning => {
            console.log(`    ⚠️  ${warning.message}`);
          });
        }
      }

      console.log('\n📊 Health Check Summary:');
      console.log(`  Total Issues: ${totalIssues}`);
      
      if (totalIssues === 0) {
        console.log('✅ All configurations are healthy!');
      } else {
        console.log('⚠️  Some configurations have health issues.');
      }

      await this.prompt('\n📱 Press Enter to continue...');

    } catch (error) {
      console.error('❌ Health check failed:', error.message);
    }
  }

  /**
   * プロンプト入力を取得
   */
  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  // 他のテンプレート管理メソッドは省略（実装が必要）
  async updateTemplate() {
    console.log('🚧 Template update functionality coming soon...');
    await this.prompt('📱 Press Enter to continue...');
  }

  async resetTemplate() {
    console.log('🚧 Template reset functionality coming soon...');
    await this.prompt('📱 Press Enter to continue...');
  }

  async exportTemplates() {
    console.log('🚧 Template export functionality coming soon...');
    await this.prompt('📱 Press Enter to continue...');
  }

  async importTemplates() {
    console.log('🚧 Template import functionality coming soon...');
    await this.prompt('📱 Press Enter to continue...');
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ConfigCLI();
  await cli.run();
}