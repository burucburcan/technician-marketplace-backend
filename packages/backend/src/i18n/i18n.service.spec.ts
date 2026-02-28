import { Test, TestingModule } from '@nestjs/testing'
import { I18nService } from './i18n.service'

describe('I18nService', () => {
  let service: I18nService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nService],
    }).compile()

    service = module.get<I18nService>(I18nService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('translate', () => {
    it('should translate key in Spanish (default)', () => {
      const result = service.translate('common.welcome')
      expect(result).toBe('Bienvenido')
    })

    it('should translate key in English', () => {
      const result = service.translate('common.welcome', 'en')
      expect(result).toBe('Welcome')
    })

    it('should translate nested keys', () => {
      const resultEs = service.translate('user.profile', 'es')
      const resultEn = service.translate('user.profile', 'en')

      expect(resultEs).toBe('Perfil')
      expect(resultEn).toBe('Profile')
    })

    it('should return key when translation not found', () => {
      const result = service.translate('non.existent.key', 'es')
      expect(result).toBe('non.existent.key')
    })

    it('should fallback to default language for unsupported language', () => {
      const result = service.translate('common.welcome', 'fr')
      expect(result).toBe('Bienvenido') // Should fallback to Spanish
    })
  })

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = service.getSupportedLanguages()
      expect(languages).toEqual(['es', 'en'])
    })
  })

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(service.isLanguageSupported('es')).toBe(true)
      expect(service.isLanguageSupported('en')).toBe(true)
    })

    it('should return false for unsupported languages', () => {
      expect(service.isLanguageSupported('fr')).toBe(false)
      expect(service.isLanguageSupported('de')).toBe(false)
      expect(service.isLanguageSupported('pt')).toBe(false)
    })
  })
})
