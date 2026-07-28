import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { FretixColors } from '@/constants/theme';
import { CustomDialog } from '@/components/custom-dialog';

WebBrowser.maybeCompleteAuthSession();

const googleClientId =
  Constants.expoConfig?.extra?.googleClientId ||
  '750540528154-nl33mipe4r1g6lnbam1k3kp59ukm9gg2.apps.googleusercontent.com';
const isExpoGo = Constants.appOwnership === 'expo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const { login, loginWithGoogle } = useAuth();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
  });

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setDialogProps({ title, message, type });
    setDialogVisible(true);
  };

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type !== 'success') {
        if (response?.type === 'error') {
          showDialog('Erro', 'Falha ao autenticar com Google', 'error');
        }
        setGoogleLoading(false);
        return;
      }

      const idToken = response.params?.id_token;
      if (!idToken) {
        showDialog('Erro', 'Google não retornou um token válido', 'error');
        setGoogleLoading(false);
        return;
      }

      try {
        await loginWithGoogle(idToken);
      } catch (error: any) {
        console.error('Google login error:', error.response?.data || error.message);
        showDialog(
          'Erro',
          error.response?.data?.message ||
          error.response?.data?.detail ||
          'Falha no login com Google',
          'error'
        );
      } finally {
        setGoogleLoading(false);
      }
    };

    handleGoogleResponse();
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      showDialog('Erro', 'Por favor, preencha todos os campos', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      showDialog(
        'Erro',
        error.response?.data?.message ||
        error.response?.data?.detail ||
        'Falha no login',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isExpoGo) {
      showDialog(
        'Google indisponível no Expo Go',
        'Use uma development build ou o app publicado para testar o login com Google.',
        'info'
      );
      return;
    }

    if (!request) {
      showDialog('Erro', 'Login com Google ainda não está pronto', 'error');
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setGoogleLoading(false);
      }
    } catch (error: any) {
      console.error('Google prompt error:', error.message);
      showDialog('Erro', 'Não foi possível abrir o login do Google', 'error');
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <View style={styles.header}>
                <Image
                  source={require('@/assets/images/splash-icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.title}>Bem-vindo de volta!</Text>
                <Text style={styles.subtitle}>Faça login para continuar</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    placeholderTextColor={FretixColors.grayLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Senha</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Sua senha"
                      placeholderTextColor={FretixColors.grayLight}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color={FretixColors.grayLight}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading || googleLoading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={FretixColors.black} />
                  ) : (
                    <Text style={styles.buttonText}>Entrar</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, (googleLoading || (!isExpoGo && !request)) && styles.buttonDisabled]}
                  onPress={handleGoogleLogin}
                  disabled={googleLoading || loading || (!isExpoGo && !request)}
                  activeOpacity={0.8}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={FretixColors.white} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={FretixColors.white} />
                      <Text style={styles.googleButtonText}>Entrar com Google</Text>
                    </>
                  )}
                </TouchableOpacity>

              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <CustomDialog
        visible={dialogVisible}
        title={dialogProps.title}
        message={dialogProps.message}
        type={dialogProps.type}
        onConfirm={() => setDialogVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FretixColors.black,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: FretixColors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: FretixColors.grayLight,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#111824',
    borderWidth: 1,
    borderColor: '#273241',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: FretixColors.white,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111824',
    borderWidth: 1,
    borderColor: '#273241',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    color: FretixColors.white,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: FretixColors.yellow,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: FretixColors.yellow,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: FretixColors.black,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#273241',
  },
  dividerText: {
    color: FretixColors.grayLight,
    fontSize: 13,
    fontWeight: '600',
  },
  googleButton: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#273241',
    backgroundColor: '#111824',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: FretixColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: FretixColors.grayLight,
    fontSize: 14,
  },
  registerLink: {
    color: FretixColors.yellow,
    fontSize: 14,
    fontWeight: '600',
  },
});
